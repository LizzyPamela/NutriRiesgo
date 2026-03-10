from pydantic import BaseModel
from typing import Optional


class NutrientesBase(BaseModel):
    energia_kcal: Optional[float] = None
    proteina_g: Optional[float] = None
    grasa_g: Optional[float] = None
    carbohidratos_g: Optional[float] = None
    fibra_g: Optional[float] = None
    calcio_mg: Optional[float] = None
    hierro_mg: Optional[float] = None
    sodio_mg: Optional[float] = None
    potasio_mg: Optional[float] = None
    zinc_mg: Optional[float] = None
    vitamina_c_mg: Optional[float] = None
    vitamina_a_mcg: Optional[float] = None


class Alimento(NutrientesBase):
    id: str
    nombre: str
    categoria: str
    fuente: str
    fdc_id: Optional[int] = None
    es_alimento_hondureno: Optional[bool] = None
    completitud_datos: Optional[float] = None

    model_config = {"from_attributes": True}


class AlimentoBusquedaResponse(BaseModel):
    total: int
    alimentos: list[Alimento]
