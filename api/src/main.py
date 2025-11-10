import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pydantic import BaseModel

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://pantry:pantry@db:5432/pantry")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    password: str
    email: str

class PantryItem(SQLModel, table=True):
    __tablename__ = "items"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    quantity: int

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

app = FastAPI(title="Smart Pantry Minimal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    SQLModel.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"ok": True}

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

@app.post("/auth/login")
def login(req: LoginRequest):
    print(f"Login attempt - email: {req.email}, password: {req.password}")
    with Session(engine) as s:
        user = s.exec(select(User).where(User.email == req.email)).first()
        print(f"User found: {user}")
        if not user or user.password != req.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"token": f"user_{user.id}", "user": {"id": user.id, "name": user.name}}

@app.post("/auth/signup")
def signup(req: SignupRequest):
    with Session(engine) as s:
        existing = s.exec(select(User).where(User.email == req.email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        user = User(name=req.name, password=req.password, email=req.email)
        s.add(user)
        s.commit()
        s.refresh(user)
        return {"token": f"user_{user.id}", "user": {"id": user.id, "name": user.name}}
