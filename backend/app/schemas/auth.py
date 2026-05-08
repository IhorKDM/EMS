from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    """ Credentials for login """
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """ Returned after successful login """
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'

class ChangePasswordRequest(BaseModel):
    """ Submitted when changing password """
    current_password: str
    new_password: str
    confirm_password: str