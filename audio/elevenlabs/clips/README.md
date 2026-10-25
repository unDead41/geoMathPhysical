# Letakkan MP3 sebenar di sini

Belum ada audio dijana atau diterima. Folder ini sengaja tidak mempunyai
fail `.mp3` kosong atau rakaman contoh yang boleh disalah anggap sebagai siap.

Gunakan tepat 30 nama daripada [mapping.csv](../mapping.csv), iaitu satu
`<ID>_soalan.mp3` dan satu `<ID>_hint.mp3` bagi P1–P3, C1–C3, K1–K3, B1–B3 dan S1–S3.
Jangan gunakan nombor pusingan rawak. Skrip asal berada di [scripts](../scripts/).

Simpan eksport MP3 ElevenLabs asal. Jika pemain perkakasan kemudian memerlukan
nama angka atau format berlainan, hasilkan salinan deployment yang dipetakan
secara eksplisit; kekalkan 30 fail canonical ini sebagai sumber.

Dari akar repo, selepas semua klip tersedia:

```text
python tools/question_audio.py --require-audio
```

Semakan ini memerlukan `ffprobe` dan tidak menggantikan mendengar semua klip.
