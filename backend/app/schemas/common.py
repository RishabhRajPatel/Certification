from pydantic import BaseModel


class Message(BaseModel):
    message: str


class OkResponse(BaseModel):
    ok: bool = True
