"""
Step 1: turn a call recording into a transcript, split by speaker.

AssemblyAI does the heavy lifting. We ask for `speaker_labels=True`, which
tells it to work out who is talking when ("speaker diarization"). Each chunk
of speech comes back as an "utterance" with a speaker letter (A, B, ...),
the text, and start/end times in milliseconds.
"""

import json
from pathlib import Path

import assemblyai as aai


def transcribe_call(audio: str, api_key: str, speakers_expected: int = 2) -> list[dict]:
    """Send a local file path or a public URL to AssemblyAI; return utterances."""
    aai.settings.api_key = api_key

    config = aai.TranscriptionConfig(
        speaker_labels=True,                 # who said what
        speakers_expected=speakers_expected, # a sales call is usually rep + buyer
    )

    # .transcribe() uploads the file (if local), starts the job, and waits.
    transcript = aai.Transcriber(config=config).transcribe(audio)

    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(f"Transcription failed: {transcript.error}")

    # Convert SDK objects into plain dicts so we can save them as JSON
    # and reuse them later without paying to transcribe again.
    return [
        {"speaker": u.speaker, "text": u.text, "start": u.start, "end": u.end}
        for u in transcript.utterances
    ]


def save_utterances(utterances: list[dict], path: Path) -> None:
    path.write_text(json.dumps(utterances, indent=2))


def load_utterances(path: Path) -> list[dict]:
    return json.loads(path.read_text())
