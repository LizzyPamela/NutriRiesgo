from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class AntecedenteFamiliar(BaseModel):
    diabetes: bool = False
    hipertension: bool = False
    cardiopatia: bool = False
    obesidad: bool = False


class PerfilCreate(BaseModel):
    edad: Optional[int] = Field(None, ge=1, le=120)
    sexo: Optional[str] = Field(None, pattern="^(masculino|femenino)$")
    peso_kg: Optional[float] = Field(None, gt=0, le=500)
    altura_cm: Optional[float] = Field(None, gt=0, le=300)
    perimetro_cintura_cm: Optional[float] = Field(None, gt=0)
    antecedentes_familiares: Optional[AntecedenteFamiliar] = None
    actividad_fisica: Optional[str] = Field(
        None,
        pattern="^(sedentario|ligero|moderado|intenso|muy_intenso)$"
    )
    fumador: Optional[bool] = None


class PerfilUpdate(PerfilCreate):
    pass


class Perfil(BaseModel):
    user_id: UUID
    edad: Optional[int] = None
    sexo: Optional[str] = None
    peso_kg: Optional[float] = None
    altura_cm: Optional[float] = None
    perimetro_cintura_cm: Optional[float] = None
    imc: Optional[float] = None
    antecedentes_familiares: Optional[dict] = None
    actividad_fisica: Optional[str] = None
    fumador: Optional[bool] = None
    riesgo_prevent: Optional[float] = None
    categoria_riesgo: Optional[str] = None
    requiere_derivacion: Optional[bool] = None
    motivo_derivacion: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
