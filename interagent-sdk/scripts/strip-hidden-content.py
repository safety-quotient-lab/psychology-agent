#!/usr/bin/env python3
"""
strip-hidden-content.py — Remove visually-hidden content from HTML.

Defends against prompt injection via CSS-hidden text: content invisible
to human eyes but readable by LLMs processing raw HTML/text. Strips
elements using known visually-hidden patterns before LLM processing.

Usage:
    echo "<html>..." | python3 strip-hidden-content.py
    python3 strip-hidden-content.py < page.html
    python3 strip-hidden-content.py --url https://example.com

Patterns detected and stripped:
    - .visually-hidden / .sr-only / .screen-reader-only classes
    - clip: rect(0,0,0,0) / clip-path: inset(50%)
    - position:absolute + dimensions near 1px
    - display:none / visibility:hidden
    - opacity:0
    - overflow:hidden + tiny dimensions
    - aria-hidden="true" (content hidden from assistive tech too)
    - <noscript> blocks (not rendered in JS-enabled contexts)

Does NOT strip:
    - aria-label/aria-describedby (legitimate accessible labels)
    - <title> / <meta> (legitimate metadata)
"""

import re
import sys
from html.parser import HTMLParser


class HiddenContentStripper(HTMLParser):
    """Parse HTML and remove elements with visually-hidden patterns."""

    HIDDEN_CLASSES = {
        'visually-hidden', 'sr-only', 'screen-reader-only',
        'screen-reader-text', 'offscreen', 'clip-hide',
        'visually-hidden-focusable', 'sr-only-focusable',
    }

    HIDDEN_STYLE_PATTERNS = [
        re.compile(r'clip\s*:\s*rect\s*\(\s*0', re.I),
        re.compile(r'clip-path\s*:\s*inset\s*\(\s*50%', re.I),
        re.compile(r'position\s*:\s*absolute.*(?:width|height)\s*:\s*1px', re.I | re.S),
        re.compile(r'display\s*:\s*none', re.I),
        re.compile(r'visibility\s*:\s*hidden', re.I),
        re.compile(r'opacity\s*:\s*0(?:\s|;|$)', re.I),
        re.compile(r'overflow\s*:\s*hidden.*(?:width|height)\s*:\s*[01]px', re.I | re.S),
        re.compile(r'(?:width|height)\s*:\s*[01]px.*overflow\s*:\s*hidden', re.I | re.S),
    ]

    def __init__(self):
        super().__init__()
        self.output = []
        self.skip_depth = 0
        self.skip_tag = None
        self.stripped_count = 0

    def _is_hidden(self, tag, attrs):
        attr_dict = dict(attrs)

        # Check aria-hidden
        if attr_dict.get('aria-hidden', '').lower() == 'true':
            return True

        # Check class names
        classes = set(attr_dict.get('class', '').split())
        if classes & self.HIDDEN_CLASSES:
            return True

        # Check inline styles
        style = attr_dict.get('style', '')
        if style:
            for pattern in self.HIDDEN_STYLE_PATTERNS:
                if pattern.search(style):
                    return True

        # <noscript> blocks
        if tag == 'noscript':
            return True

        return False

    def handle_starttag(self, tag, attrs):
        if self.skip_depth > 0:
            self.skip_depth += 1
            return

        if self._is_hidden(tag, attrs):
            self.skip_depth = 1
            self.skip_tag = tag
            self.stripped_count += 1
            return

        attr_str = ''
        for k, v in attrs:
            if v is None:
                attr_str += f' {k}'
            else:
                attr_str += f' {k}="{v}"'
        self.output.append(f'<{tag}{attr_str}>')

    def handle_endtag(self, tag):
        if self.skip_depth > 0:
            self.skip_depth -= 1
            return
        self.output.append(f'</{tag}>')

    def handle_data(self, data):
        if self.skip_depth > 0:
            return
        self.output.append(data)

    def handle_comment(self, data):
        if self.skip_depth > 0:
            return
        # Strip HTML comments too (can carry hidden instructions)
        pass

    def handle_entityref(self, name):
        if self.skip_depth > 0:
            return
        self.output.append(f'&{name};')

    def handle_charref(self, name):
        if self.skip_depth > 0:
            return
        self.output.append(f'&#{name};')

    def get_result(self):
        return ''.join(self.output)


def strip_invisible_unicode(text: str) -> str:
    """Remove zero-width and invisible Unicode characters used for prompt injection."""
    # Zero-width spaces, joiners, direction marks
    invisible = re.compile(
        '[\u200B-\u200F'   # zero-width space, non-joiner, joiner, LTR/RTL marks
        '\u2060-\u2064'    # word joiner, invisible operators
        '\uFEFF'           # byte order mark
        '\u00AD'           # soft hyphen
        '\u034F'           # combining grapheme joiner
        '\u061C'           # Arabic letter mark
        '\u115F\u1160'     # Hangul fillers
        '\u17B4\u17B5'     # Khmer vowel inherent
        '\u180E'           # Mongolian vowel separator
        '\u2000-\u200A'    # various width spaces
        '\u202A-\u202E'    # bidi embedding/override
        '\u2066-\u2069'    # bidi isolate
        '\uFFF9-\uFFFB'    # interlinear annotation
        '\U000E0001-\U000E007F'  # tag characters (invisible ASCII in plane 14)
        ']+'
    )
    return invisible.sub('', text)


def strip_hidden(html: str) -> tuple[str, int]:
    """Strip visually-hidden content and invisible Unicode from HTML."""
    stripper = HiddenContentStripper()
    stripper.feed(html)
    result = stripper.get_result()
    # Also strip invisible Unicode characters
    result = strip_invisible_unicode(result)
    return result, stripper.stripped_count


def main():
    if '--url' in sys.argv:
        idx = sys.argv.index('--url')
        if idx + 1 < len(sys.argv):
            import urllib.request
            url = sys.argv[idx + 1]
            with urllib.request.urlopen(url, timeout=10) as resp:
                html = resp.read().decode('utf-8', errors='replace')
        else:
            print("Usage: --url <URL>", file=sys.stderr)
            sys.exit(1)
    else:
        html = sys.stdin.read()

    clean, count = strip_hidden(html)
    print(clean)
    if count > 0:
        print(f"[strip-hidden] Removed {count} hidden element(s)", file=sys.stderr)


if __name__ == "__main__":
    main()
