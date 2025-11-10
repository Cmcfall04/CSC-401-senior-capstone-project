from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine, Session, select
from pydantic import BaseModel

DATABASE_URL = "postgresql://pantry:pantry@db:5432/smart_pantry"
engine = create_engine(DATABASE_URL)

class PantryItem(BaseModel):
    name: str
    quantity: float = 1
    unit: str = ""

app = FastAPI()

@app.on_event("startup")
def startup():
    SQLModel.metadata.create_all(engine)

@app.get("/items")
def list_items():
    with Session(engine) as s:
        return s.exec(select(PantryItem)).all()

@app.post("/items")
def create_item(item: PantryItem):
    with Session(engine) as s:
        s.add(item)
        s.commit()
        s.refresh(item)
        return item
