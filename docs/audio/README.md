# Skrip audio soalan dan hint Physical

Pakej skrip revision 2 diselaraskan pada 6 November 2026 untuk firmware v2.0.4.
Sumber tunggal ialah `audio/elevenlabs/manifest.json`; rujukan v1.1.3 asal disimpan
dalam `original_reference`. Semua 30 teks suara asal dikekalkan tepat.

**MP3 sebenar belum dijana dan firmware belum mempunyai pemain audio.**
Gunakan [SCRIPTS.md](SCRIPTS.md), [mapping](MAPPING.md),
[30 fail teks](../../audio/elevenlabs/scripts/) dan folder klip.
Jana satu MP3 bagi satu fail teks dengan nama canonical `<ID>_soalan.mp3` atau `<ID>_hint.mp3`.
Dengar setiap klip sebelum menandakan approved; jangan masukkan kunci API ke repo.

Metadata `Question.focus` semasa menentukan urutan: SOLID ialah R1→R2, NET ialah R2→R1.
Jawapan, tiga baris soalan/hint dan teks penuh tidak berubah daripada pakej asal;
snapshot kini turut merekodkan fokus serta dua baris penerangan.

```powershell
python tools/question_audio.py
python tools/question_audio.py --write
python tools/question_audio.py --require-audio
```

Semakan biasa boleh melaporkan 0/30 klip, kerana ia mengesahkan skrip sahaja.
`--require-audio` memerlukan semua 30 MP3 dan ffprobe; keputusan codec bukan semakan sebutan.
[Audit integrasi sejarah](INTEGRATION.md) dan [bukti asal](VERIFICATION.md)
menerangkan sumber lama; ikut [GAME_FLOW_RGB](../GAME_FLOW_RGB.md) untuk flow semasa.
