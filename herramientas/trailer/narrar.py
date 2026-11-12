"""Genera la narración del tráiler con Piper (voz neuronal, sin conexión).

Uso:  python narrar.py <carpeta_de_voces> <carpeta_de_salida>
Requiere:  pip install piper-tts   y la voz descargada con
           python -m piper.download_voices es_ES-sharvard-medium
Escribe una pista WAV por toma y duraciones.json con la duración de cada una.
"""
import json
import pathlib
import sys
import wave

from piper import PiperVoice, SynthesisConfig

AQUI = pathlib.Path(__file__).parent
voces = pathlib.Path(sys.argv[1])
salida = pathlib.Path(sys.argv[2])
salida.mkdir(parents=True, exist_ok=True)

guion = json.loads((AQUI / "guion.json").read_text(encoding="utf-8"))
voz = PiperVoice.load(str(voces / f"{guion['voz']}.onnx"))
# Un poco más lento y con más pausa entre frases: ritmo de narrador.
config = SynthesisConfig(length_scale=1.12, noise_scale=0.6, noise_w_scale=0.75, speaker_id=guion.get("hablante"))

duraciones = {}
for toma in guion["tomas"]:
    if not toma["texto"]:
        duraciones[toma["id"]] = 0
        continue
    archivo = salida / f"{toma['id']}.wav"
    with wave.open(str(archivo), "wb") as wav:
        voz.synthesize_wav(toma["texto"], wav, syn_config=config)
    with wave.open(str(archivo), "rb") as wav:
        duraciones[toma["id"]] = wav.getnframes() / wav.getframerate()
    print(f"{toma['id']:12} {duraciones[toma['id']]:5.2f} s", flush=True)

(salida / "duraciones.json").write_text(json.dumps(duraciones, indent=2), encoding="utf-8")
