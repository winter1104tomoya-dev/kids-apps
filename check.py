import json, sys, os, subprocess, numpy as np, pykakasi
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
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', os.path.join(d, 'ja', h + '.mp3'), '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(audio, language='ja', beam_size=5)
    heard = ''.join(s.text for s in segs).strip().strip('。、.!！')
    ok = hira(heard) == hira(text)
    print(f"{'OK' if ok else 'NG'} {text} -> {heard} ({hira(heard)})", flush=True)
    if not ok: bad.append(text)
print('\nNG:', ' '.join(bad))
