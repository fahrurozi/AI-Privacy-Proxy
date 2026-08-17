from presidio_analyzer import Pattern, PatternRecognizer

class EthereumAddressRecognizer(PatternRecognizer):
    """Recognizer for Ethereum hex addresses (e.g. 0x71C...40 hex characters)."""

    PATTERNS = [
        Pattern(
            "ETHEREUM_ADDRESS_PATTERN",
            r"\b0x[a-fA-F0-9]{40}\b",
            0.95,
        )
    ]

    def __init__(self):
        super().__init__(
            supported_entity="ETHEREUM_ADDRESS",
            patterns=self.PATTERNS,
            name="EthereumAddressRecognizer",
        )
