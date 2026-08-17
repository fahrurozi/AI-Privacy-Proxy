from presidio_analyzer import Pattern, PatternRecognizer

class SecretsRecognizer(PatternRecognizer):
    """Recognizer for API Keys, Private Keys, Passwords and Mnemonic Seed Phrases."""

    PATTERNS = [
        # Generic OpenAI/Anthropic/Bearer API Keys
        Pattern("OPENAI_KEY", r"\bsk-[a-zA-Z0-9_-]{20,}\b", 0.95),
        Pattern("ANTHROPIC_KEY", r"\bsk-ant-[a-zA-Z0-9_-]{20,}\b", 0.95),
        Pattern("GITHUB_TOKEN", r"\bgh[pousr]_[a-zA-Z0-9]{36,}\b", 0.95),
        Pattern("AWS_ACCESS_KEY", r"\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b", 0.95),
        Pattern("BEARER_TOKEN", r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}", 0.85),
        Pattern("GENERIC_API_KEY", r"(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{16,})['\"]?", 0.85),
        
        # Crypto Private Keys (64 hex characters)
        Pattern("HEX_PRIVATE_KEY", r"\b(?:0x)?[a-fA-F0-9]{64}\b", 0.90),

        # Common password assignments
        Pattern("PASSWORD_ASSIGNMENT", r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"]?([^\s'\"]{6,})['\"]?", 0.85),
    ]

    def __init__(self):
        super().__init__(
            supported_entity="API_KEY",
            patterns=self.PATTERNS,
            name="SecretsRecognizer",
        )
