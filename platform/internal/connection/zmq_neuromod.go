// ZMQ-A neuromodulatory adapter: chemical volume transmission for non-optical
// neuromodulatory signals (GABAergic tonic inhibition, cholinergic attention).
// Concentration-based, receptor-density-modulated, slower tonic rate (10-30s).
//
// This adapter uses a SEPARATE ZMQ socket from the photonic layer (ZMQ-B).
// The split reflects different physics: chemical diffusion (seconds) vs
// optical waveguide (speed of light).
package connection

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-zeromq/zmq4"
)

// ZMQNeuromod implements VTChannel over ZMQ PUB/SUB for chemical
// volume transmission (GABAergic inhibition + cholinergic attention).
type ZMQNeuromod struct {
	agentID string
	pub     zmq4.Socket
	sub     zmq4.Socket
	mu      sync.RWMutex

	inhibitCh chan InhibitSignal
	focusCh   chan FocusSignal

	cancel context.CancelFunc
}

// NewZMQNeuromod creates a neuromodulatory VT channel.
// pubAddr: ZMQ PUB bind address (e.g., "tcp://*:9001")
// subAddrs: peer ZMQ PUB addresses to subscribe to
func NewZMQNeuromod(ctx context.Context, agentID, pubAddr string, subAddrs []string) (*ZMQNeuromod, error) {
	ctx, cancel := context.WithCancel(ctx)

	n := &ZMQNeuromod{
		agentID:   agentID,
		inhibitCh: make(chan InhibitSignal, 100),
		focusCh:   make(chan FocusSignal, 100),
		cancel:    cancel,
	}

	// PUB socket — broadcast our signals
	n.pub = zmq4.NewPub(ctx)
	if err := n.pub.Listen(pubAddr); err != nil {
		cancel()
		return nil, fmt.Errorf("zmq pub listen %s: %w", pubAddr, err)
	}
	log.Printf("[zmq-neuromod] PUB listening on %s", pubAddr)

	// SUB socket — receive peer signals
	n.sub = zmq4.NewSub(ctx)
	if err := n.sub.SetOption(zmq4.OptionSubscribe, "inhibit"); err != nil {
		log.Printf("[zmq-neuromod] WARNING: subscribe inhibit: %v", err)
	}
	if err := n.sub.SetOption(zmq4.OptionSubscribe, "focus"); err != nil {
		log.Printf("[zmq-neuromod] WARNING: subscribe focus: %v", err)
	}

	for _, addr := range subAddrs {
		if err := n.sub.Dial(addr); err != nil {
			log.Printf("[zmq-neuromod] WARNING: connect to %s: %v", addr, err)
		} else {
			log.Printf("[zmq-neuromod] SUB connected to %s", addr)
		}
	}

	// Receive loop
	go n.receiveLoop(ctx)

	return n, nil
}

// PublishInhibit broadcasts a tonic GABAergic inhibition signal.
func (n *ZMQNeuromod) PublishInhibit(concentration float64, workItem string) error {
	signal := InhibitSignal{
		AgentID:       n.agentID,
		Concentration: concentration,
		WorkItem:      workItem,
		TTLms:         30000, // 30s — chemical diffusion rate
		Timestamp:     time.Now(),
	}
	data, err := json.Marshal(signal)
	if err != nil {
		return err
	}
	msg := zmq4.NewMsgFrom([]byte("inhibit"), data)
	return n.pub.Send(msg)
}

// PublishFocus broadcasts a cholinergic attention/domain signal.
func (n *ZMQNeuromod) PublishFocus(domain string, intensity float64) error {
	signal := FocusSignal{
		AgentID:   n.agentID,
		Domain:    domain,
		Intensity: intensity,
		TTLms:     30000,
		Timestamp: time.Now(),
	}
	data, err := json.Marshal(signal)
	if err != nil {
		return err
	}
	msg := zmq4.NewMsgFrom([]byte("focus"), data)
	return n.pub.Send(msg)
}

// SubscribeInhibit returns a channel receiving peer inhibition signals.
func (n *ZMQNeuromod) SubscribeInhibit() <-chan InhibitSignal {
	return n.inhibitCh
}

// SubscribeFocus returns a channel receiving peer focus signals.
func (n *ZMQNeuromod) SubscribeFocus() <-chan FocusSignal {
	return n.focusCh
}

// Close releases ZMQ resources.
func (n *ZMQNeuromod) Close() error {
	n.cancel()
	n.pub.Close()
	n.sub.Close()
	return nil
}

func (n *ZMQNeuromod) receiveLoop(ctx context.Context) {
	for {
		msg, err := n.sub.Recv()
		if err != nil {
			select {
			case <-ctx.Done():
				return
			default:
				log.Printf("[zmq-neuromod] recv error: %v", err)
				time.Sleep(time.Second)
				continue
			}
		}

		if len(msg.Frames) < 2 {
			continue
		}

		topic := string(msg.Frames[0])
		data := msg.Frames[1]

		switch topic {
		case "inhibit":
			var signal InhibitSignal
			if json.Unmarshal(data, &signal) == nil {
				select {
				case n.inhibitCh <- signal:
				default:
					// Channel full — drop oldest
				}
			}
		case "focus":
			var signal FocusSignal
			if json.Unmarshal(data, &signal) == nil {
				select {
				case n.focusCh <- signal:
				default:
				}
			}
		}
	}
}
