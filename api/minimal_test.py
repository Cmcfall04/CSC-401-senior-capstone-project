from fastapi import FastAPI

print("Creating FastAPI app...")
app = FastAPI()

@app.get("/")
def root():
    print("Root endpoint called")
    return {"message": "Hello World"}

@app.get("/test")
def test():
    print("Test endpoint called")
    return {"message": "Test works"}

print("FastAPI app created successfully")