# Reproduce the bundled Chinese greeting clips with a locally installed voice.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voiceSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $voiceSynth.SelectVoice('Microsoft Huihui Desktop')
    $voiceSynth.Rate = -1
    # ASCII source also runs under Windows PowerShell 5 without a UTF-8 BOM.
    $clips = @{
        'hello.wav' = -join ([char[]]@(0x4F60,0x597D,0xFF01))
        'hello-tuantuan.wav' = -join ([char[]]@(0x4F60,0x597D,0xFF0C,0x6211,0x662F,0x56E2,0x56E2,0xFF01))
    }
    $audioDirectory = Join-Path $PSScriptRoot '../apps/web/public/assets/sounds'
    foreach ($name in $clips.Keys) {
        $voiceSynth.SetOutputToWaveFile([IO.Path]::GetFullPath((Join-Path $audioDirectory $name)))
        $voiceSynth.Speak($clips[$name])
        $voiceSynth.SetOutputToNull()
    }
} finally {
    $voiceSynth.Dispose()
}
