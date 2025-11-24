import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pydantic import BaseModel
from sqlalchemy import UniqueConstraint

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://pantry:pantry@db:5432/pantry")
USDA_API_KEY = os.getenv("USDA_API_KEY", "BkguDn4ozDPqjoGZ0ocTemdgM14SZsMeWlx7XNx1") # My API key for the USDA Food

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    password: str
    email: str
    created_at: str
    updated_at: str

class Households(SQLModel, table=True):
    __tablename__ = "households"
    id: int | None = Field(default=None, primary_key=True)
    name : str
    created_at: str
    status: str =Field(default="inactive", nullable=False)
    code: str

class HouseholdUsers(SQLModel, table=True):
    __tablename__ = "household_users"
    __table_args__ = (UniqueConstraint("household_id", "user_id"),)
    id: int | None = Field(default=None, primary_key=True)
    household_id: int = Field(foreign_key="households.id", nullable=False)
    user_id: int = Field(foreign_key="users.id", nullable=False)
    created_at: str
    role: str =Field(default="member", nullable=False)
    status: str =Field(default="inactive", nullable=False)


class FoodCatalog(SQLModel, table=True):
    __tablename__ = "food_catalog"
    id: int | None = Field(default=None, primary_key=True)
    usda_fdc_id: int | None = Field(default=None, unique=True)
    name: str
    calories: int | None = None
    protein: int | None = None
    carbs: int | None = None
    fat: int | None = None
    sugar: int | None = None
    fiber: int | None = None
    sodium: int | None = None

class PantryItem(SQLModel, table=True):
    __tablename__ = "items"
    id: int | None = Field(default=None, primary_key=True)
    household_id: int = Field(foreign_key="households.id")
    food_id: int = Field(foreign_key="food_catalog.id")
    quantity: int
    expiration_date: str | None = None
    purchase_date: str | None = None
    created_at: str | None = None

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

@app.get("/households")
def list_households():
    with Session(engine) as s:
        return s.exec(select(Households)).all()

@app.post("/households")
def create_household(household: Households):
    with Session(engine) as s:
        s.add(household)
        s.commit()
        s.refresh(household)
        return household

@app.get("/household_users")
def get_household_users(household_id: int):
    with Session(engine) as s:
        return s.exec(select(HouseholdUsers).where(HouseholdUsers.household_id == household_id)).all()

@app.post("/hoseuhold_users")
def create_household_users(househhold_users: HouseholdUsers):
    with Session(engine) as s:
        s.add(househhold_users)
        s.commit()
        s.refresh(househhold_users)
        return househhold_users



@app.get("/items")
def list_items():
    with Session(engine) as s:
        return s.exec(select(PantryItem)).all()

@app.get("/food/search")
async def search_food(query: str):
    url = f"https://api.nal.usda.gov/fdc/v1/foods/search?query={query}&pageSize=10&api_key={USDA_API_KEY}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        return data.get("foods", [])

@app.get("/food_catalog")
def list_food_cattalog():
    with Session(engine) as s:

        return s.exec(select(FoodCatalog)).all()

@app.post("/food/add-to-catalog")
def add_to_catalog(usda_fdc_id: int, name: str):
    with Session(engine) as s:
        existing = s.exec(select(FoodCatalog).where(FoodCatalog.usda_fdc_id == usda_fdc_id)).first()
        if existing:
            return existing
        
        url = f"https://api.nal.usda.gov:443/fdc/v1/food/{usda_fdc_id}?api_key={USDA_API_KEY}"
        response = httpx.get(url)
        data = response.json()
        
        label = data.get("labelNutrients", {})
        
        food = FoodCatalog(
            usda_fdc_id=usda_fdc_id,
            name=name,
            calories=int(label.get("calories", {}).get("value", 0)),
            protein=int(label.get("protein", {}).get("value", 0)),
            carbs=int(label.get("carbohydrates", {}).get("value", 0)),
            fat=int(label.get("fat", {}).get("value", 0)),
            sugar=int(label.get("sugars", {}).get("value", 0)),
            fiber=int(label.get("fiber", {}).get("value", 0)),
            sodium=int(label.get("sodium", {}).get("value", 0))
        )
        s.add(food)
        s.commit()
        s.refresh(food)
        return food

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
