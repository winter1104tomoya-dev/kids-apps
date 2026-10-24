import json, sys, os, pykakasi
from faster_whisper import WhisperModel
d = sys.argv[1]
v = json.load(open(os.path.join(d, 'voices.json')))
kks = pykakasi.kakasi()
def hira(s):
    return ''.join(x['hira'] for x in kks.convert(s)).replace('ー', '')
m = WhisperModel('large-v3', device='cpu', compute_type='int8')
print(f"## {v['voice']['ja']}\n")
bad = []
for text, h in v['ja'].items():
    segs, _ = m.transcribe(os.path.join(d, 'ja', h + '.mp3'), language='ja', beam_size=5)
    heard = ''.join(s.text for s in segs).strip().strip('。、.!！')
    ok = hira(heard) == hira(text)
    print(f"{'OK' if ok else 'NG'} {text} -> {heard} ({hira(heard)})", flush=True)
    if not ok: bad.append(text)
print('\nNG:', ' '.join(bad))
