from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class AlimentoRegistro(BaseModel):
    alimento_id: str
    nombre: str
    cantidad_g: float = Field(gt=0)
    energia_kcal: Optional[float] = None
    proteina_g: Optional[float] = None
    carbohidratos_g: Optional[float] = None
    grasas_g: Optional[float] = None


class RegistroComidaCreate(BaseModel):
    fecha: date
    tiempo_comida: str = Field(pattern="^(desayuno|almuerzo|cena|merienda)$")
    alimentos: list[AlimentoRegistro]
    notas: Optional[str] = None


class RegistroComida(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    fecha: date
    tiempo_comida: str
    alimentos: list[dict]
    total_calorias: Optional[float] = None
    total_proteina_g: Optional[float] = None
    total_carbohidratos_g: Optional[float] = None
    total_grasas_g: Optional[float] = None
    notas: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResumenDiario(BaseModel):
    fecha: date
    total_calorias: float
    total_proteina_g: float
    total_carbohidratos_g: float
    total_grasas_g: float
    registros: list[RegistroComida]
