import re
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_analyzer.nlp_engine import NlpEngineProvider

from app.recognizers.ethereum_address import EthereumAddressRecognizer
from app.recognizers.solana_address import SolanaAddressRecognizer
from app.recognizers.secrets import SecretsRecognizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("presidio-service")

app = FastAPI(title="AI Privacy Proxy - Presidio Analyzer Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def build_analyzer_engine() -> AnalyzerEngine:
    try:
        # Explicitly configure spaCy model (en_core_web_sm)
        configuration = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
        }
        provider = NlpEngineProvider(nlp_configuration=configuration)
        nlp_engine = provider.create_engine()
        engine = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])
        logger.info("Initialized Presidio AnalyzerEngine with en_core_web_sm")
    except Exception as e:
        logger.warning(f"Could not load custom NlpEngine, falling back to default AnalyzerEngine: {e}")
        try:
            engine = AnalyzerEngine()
        except Exception as err:
            logger.error(f"Fallback AnalyzerEngine failed: {err}")
            # Empty fallback engine if spacy models missing
            engine = AnalyzerEngine(nlp_engine=None, supported_languages=["en"])

    try:
        engine.registry.add_recognizer(EthereumAddressRecognizer())
        engine.registry.add_recognizer(SolanaAddressRecognizer())
        engine.registry.add_recognizer(SecretsRecognizer())
    except Exception as e:
        logger.error(f"Error registering custom pattern recognizers: {e}")

    return engine

analyzer = build_analyzer_engine()
custom_recognizers_store = {}

class AnalyzeRequest(BaseModel):
    text: str
    language: str = "en"
    entities: Optional[List[str]] = None
    score_threshold: Optional[float] = 0.5

class PresidioResultItem(BaseModel):
    entity_type: str
    start: int
    end: int
    score: float

class CustomRecognizerModel(BaseModel):
    id: Optional[str] = None
    name: str
    entityType: str
    pattern: str
    score: float = 0.85
    enabled: bool = True

@app.get("/")
def root():
    return {"service": "presidio-analyzer", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "presidio"}

@app.get("/ready")
def ready():
    return {"status": "ready", "service": "presidio"}

@app.post("/analyze", response_model=List[PresidioResultItem])
def analyze(req: AnalyzeRequest):
    if not req.text:
        return []
    
    try:
        results = analyzer.analyze(
            text=req.text,
            language=req.language,
            entities=req.entities,
            score_threshold=req.score_threshold or 0.5,
        )
        return [
            PresidioResultItem(
                entity_type=r.entity_type,
                start=r.start,
                end=r.end,
                score=r.score,
            )
            for r in results
        ]
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recognizers")
def get_recognizers():
    registered = []
    for r in analyzer.registry.recognizers:
        registered.append({
            "name": r.name,
            "supported_entities": r.supported_entities,
            "supported_language": r.supported_language,
        })
    return {
        "custom": list(custom_recognizers_store.values()),
        "registered": registered,
    }

@app.post("/recognizers")
def add_custom_recognizer(item: CustomRecognizerModel):
    rec_id = item.id or f"custom_{len(custom_recognizers_store) + 1}"
    
    try:
        re.compile(item.pattern)
    except re.error as e:
        raise HTTPException(status_code=400, detail=f"Invalid regular expression: {e}")

    pattern = Pattern(name=f"{item.name}_pattern", regex=item.pattern, score=item.score)
    custom_rec = PatternRecognizer(
        supported_entity=item.entityType,
        patterns=[pattern],
        name=item.name,
    )
    
    custom_recognizers_store[rec_id] = item.dict()
    analyzer.registry.add_recognizer(custom_rec)
    return {"status": "added", "id": rec_id, "recognizer": item}

@app.delete("/recognizers/{rec_id}")
def delete_custom_recognizer(rec_id: str):
    if rec_id not in custom_recognizers_store:
        raise HTTPException(status_code=404, detail="Recognizer not found")
    del custom_recognizers_store[rec_id]
    
    global analyzer
    analyzer = build_analyzer_engine()
    for stored in custom_recognizers_store.values():
        if stored.get("enabled", True):
            pattern = Pattern(
                name=f"{stored['name']}_pattern",
                regex=stored["pattern"],
                score=stored["score"],
            )
            analyzer.registry.add_recognizer(
                PatternRecognizer(
                    supported_entity=stored["entityType"],
                    patterns=[pattern],
                    name=stored["name"],
                )
            )
    return {"status": "deleted", "id": rec_id}
