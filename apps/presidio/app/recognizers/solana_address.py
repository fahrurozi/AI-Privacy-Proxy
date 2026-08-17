from presidio_analyzer import Pattern, PatternRecognizer

class SolanaAddressRecognizer(PatternRecognizer):
    """Recognizer for Solana Base58 public keys (32-44 characters)."""

    PATTERNS = [
        Pattern(
            "SOLANA_ADDRESS_PATTERN",
            r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b",
            0.75,
        )
    ]

    def __init__(self):
        super().__init__(
            supported_entity="SOLANA_ADDRESS",
            patterns=self.PATTERNS,
            name="SolanaAddressRecognizer",
        )
