package oscillator

import "os"

// statFile wraps os.Stat for testability.
func statFile(path string) (os.FileInfo, error) {
	return os.Stat(path)
}
