"""
Construye data/processed/alimentos.json.
Fuentes:
  1. USDA FoodData Central - todos los tipos excepto branded/experimental (~91k)
  2. INCAP-Tablas.pdf - tabla centroamericana (~1,448)
  3. Manual Honduras - bebidas tradicionales y platillos tipicos (~192)
Meta: >500% expansion sobre base original (7,485).
"""
import json, re
from collections import defaultdict
from pathlib import Path
import fitz
import pandas as pd

CSV_DIR   = Path("data-guias/FoodData_Central_csv_2025-12-18")
INCAP_PDF = Path("data-guias/INCAP-Tablas.pdf")
OUT_FILE  = Path("data/processed/alimentos.json")
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

NUTRIENT_MAP = {
    1008: "energia_kcal",  1003: "proteina_g",
    1004: "grasa_g",       1005: "carbohidratos_g",
    1079: "fibra_g",       1087: "calcio_mg",
    1089: "hierro_mg",     1093: "sodio_mg",
    1162: "vitamina_c_mg", 1095: "zinc_mg",
}

DATA_TYPES_OK = {
    "sr_legacy_food", "foundation_food", "survey_fndds_food",
    "market_acquistion", "sample_food", "sub_sample_food",
    "agricultural_acquisition",
}

CAT_ES = {
    1:"lacteos_huevos", 2:"especias_hierbas", 3:"alimentos_bebe",
    4:"grasas_aceites", 5:"aves", 6:"sopas_salsas", 7:"embutidos",
    8:"cereales_desayuno", 9:"frutas", 10:"carnes_cerdo", 11:"verduras",
    12:"nueces_semillas", 13:"carnes_res", 14:"bebidas", 15:"pescados_mariscos",
    16:"leguminosas", 17:"carnes_otras", 18:"panificados", 19:"dulces_azucares",
    20:"cereales_granos", 21:"comida_rapida", 22:"platillos_preparados",
    23:"snacks", 24:"alimentos_indigenas", 25:"restaurante", 28:"bebidas_alcoholicas",
}
FNDDS_PREFIX = {
    11:"lacteos_huevos",12:"lacteos_huevos",13:"lacteos_huevos",14:"lacteos_huevos",
    21:"carnes_res",22:"carnes_cerdo",23:"carnes_otras",24:"aves",25:"pescados_mariscos",
    31:"lacteos_huevos",32:"leguminosas",33:"nueces_semillas",
    41:"panificados",42:"panificados",43:"dulces_azucares",44:"dulces_azucares",
    51:"cereales_granos",52:"cereales_granos",53:"cereales_granos",
    61:"frutas",62:"bebidas",71:"verduras",72:"verduras",
    81:"grasas_aceites",82:"grasas_aceites",91:"dulces_azucares",92:"dulces_azucares",
}

def _cat(cat_id):
    try:
        cid = int(cat_id)
    except:
        return "otros"
    return CAT_ES.get(cid, FNDDS_PREFIX.get(cid // 100, "platillos_mixtos"))

def _v(v):
    try: return round(float(v), 3)
    except: return None

# ---------------------------------------------------------------------------
# INCAP parser posicional
# ---------------------------------------------------------------------------
INCAP_COLS = [
    (265,288,"agua_pct"),(288,310,"energia_kcal"),(310,330,"proteina_g"),
    (330,350,"grasa_g"),(350,372,"carbohidratos_g"),(372,395,"fibra_g"),
    (392,415,"ceniza_g"),(415,438,"calcio_mg"),(438,458,"fosforo_mg"),
    (456,478,"hierro_mg"),(478,500,"tiamina_mg"),(498,522,"riboflavina_mg"),
    (518,542,"niacina_mg"),(540,562,"vitamina_c_mg"),(557,580,"vitamina_a_mcg"),
    (577,600,"grasa_monosat_g"),(597,620,"grasa_polisat_g"),(617,642,"grasa_sat_g"),
    (638,660,"colesterol_mg"),(658,682,"potasio_mg"),(678,700,"sodio_mg"),
    (698,720,"zinc_mg"),(718,742,"magnesio_mg"),(738,760,"vitamina_b6_mg"),
    (758,785,"vitamina_b12_mcg"),(780,802,"acido_folico_mcg"),
    (799,820,"folato_mcg"),(814,835,"fraccion_comestible_pct"),
]

def _incap_cat(code):
    g = code//1000 if code<10000 else code//10000
    return {1:"lacteos_quesos",2:"lacteos_huevos",3:"aves",4:"carnes_cerdo",
            5:"carnes_res",6:"carnes_caza",7:"embutidos",8:"pescados_mariscos",
            9:"leguminosas",10:"nueces_semillas",11:"verduras",12:"frutas",
            13:"cereales_granos",14:"panificados",15:"dulces_azucares",
            16:"grasas_aceites",17:"bebidas",18:"especias_condimentos",
            19:"comida_rapida",20:"alimentos_preparados",21:"sopas_caldos"}.get(g,"otros")

def parse_incap_page(page):
    rows = defaultdict(list)
    for w in page.get_text("words"):
        x0,y0,_,_,text,*_ = w
        rows[round(y0/8)*8].append((x0,text))
    recs, code_p, num_p = [], re.compile(r"^\d{4,5}$"), re.compile(r"^-?\d+\.?\d*$")
    for y in sorted(rows):
        row = sorted(rows[y])
        if not row: continue
        fx,ft = row[0]
        if not (fx<60 and code_p.match(ft)): continue
        code = int(ft)
        name = " ".join(t for x,t in row if 60<=x<265).strip()
        if not name: continue
        nuts = {}
        for xmn,xmx,fld in INCAP_COLS:
            vals = [t for x,t in row if xmn<=x<xmx and num_p.match(t)]
            nuts[fld] = _v(vals[0]) if vals else None
        recs.append({"code":code,"nombre":name,"categoria":_incap_cat(code),"n":nuts})
    return recs

def build_incap():
    if not INCAP_PDF.exists(): return []
    doc = fitz.open(str(INCAP_PDF))
    all_r, seen = [], set()
    for page in doc:
        for r in parse_incap_page(page):
            if r["code"] not in seen:
                seen.add(r["code"]); all_r.append(r)
    doc.close()
    print(f"  INCAP: {len(all_r)} alimentos")
    return all_r

# ---------------------------------------------------------------------------
# Manual Honduras/CA
# ---------------------------------------------------------------------------
def _n(kcal,prot,grasa,cho,fibra=None,ca=None,fe=None,na=None,vitc=None,zn=None):
    return {"energia_kcal":kcal,"proteina_g":prot,"grasa_g":grasa,
            "carbohidratos_g":cho,"fibra_g":fibra,"calcio_mg":ca,
            "hierro_mg":fe,"sodio_mg":na,"vitamina_c_mg":vitc,"zinc_mg":zn}

MANUAL = [
    # -- Aguas --
    {"nombre":"Agua pura",                              "cat":"bebidas","n":_n(0,0,0,0,0,None,0,None,0,0)},
    {"nombre":"Agua mineral natural",                   "cat":"bebidas","n":_n(0,0,0,0,0,48,0,6,0,0)},
    {"nombre":"Agua mineral con gas",                   "cat":"bebidas","n":_n(0,0,0,0,0,33,0,24,0,0)},
    {"nombre":"Agua con limon natural",                 "cat":"bebidas","n":_n(8,0.1,0,2.2,0,5,0.1,1,9,0)},
    {"nombre":"Agua con limon y sal",                   "cat":"bebidas","n":_n(8,0.1,0,2.2,0,5,0.1,230,9,0)},
    {"nombre":"Agua de jamaica hibisco",                "cat":"bebidas","n":_n(30,0.2,0,7.5,0,8,0.2,3,7,0)},
    {"nombre":"Agua de tamarindo natural",              "cat":"bebidas","n":_n(45,0.4,0.1,11.2,0.1,6,0.3,5,2,0)},
    {"nombre":"Agua de coco natural",                   "cat":"bebidas","n":_n(19,0.7,0.2,3.7,1.1,24,0.3,105,2.4,0.1)},
    {"nombre":"Agua de panela guarapo dulce",           "cat":"bebidas","n":_n(65,0,0,16.2,0,10,0.3,8,0,0)},
    {"nombre":"Agua de cebada",                         "cat":"bebidas","n":_n(40,0.5,0.2,9.0,0.1,6,0.2,2,0,0)},
    {"nombre":"Limonada con agua mineral",              "cat":"bebidas","n":_n(20,0.1,0,5.2,0,5,0.1,24,9,0)},
    # -- Tes --
    {"nombre":"Te negro sin azucar",                    "cat":"bebidas","n":_n(1,0,0,0.3,0,0,0,3,0,0)},
    {"nombre":"Te negro con azucar",                    "cat":"bebidas","n":_n(30,0,0,7.5,0,0,0,3,0,0)},
    {"nombre":"Te verde sin azucar",                    "cat":"bebidas","n":_n(0,0,0,0,0,0,0,1,0,0)},
    {"nombre":"Te verde con limon",                     "cat":"bebidas","n":_n(5,0,0,1.2,0,1,0,1,3,0)},
    {"nombre":"Te de manzanilla",                       "cat":"bebidas","n":_n(1,0,0,0.2,0,3,0,1,1,0)},
    {"nombre":"Te de tilo",                             "cat":"bebidas","n":_n(1,0,0,0.2,0,3,0,1,0,0)},
    {"nombre":"Te de hierbabuena",                      "cat":"bebidas","n":_n(1,0,0,0.3,0,3,0.1,2,2,0)},
    {"nombre":"Te de canela",                           "cat":"bebidas","n":_n(3,0,0,0.7,0,4,0.1,1,0,0)},
    {"nombre":"Te de jengibre",                         "cat":"bebidas","n":_n(2,0,0,0.5,0,2,0.1,2,1,0)},
    {"nombre":"Te de limon citronela",                  "cat":"bebidas","n":_n(2,0,0,0.5,0,2,0,1,2,0)},
    {"nombre":"Te de malva",                            "cat":"bebidas","n":_n(1,0,0,0.2,0,3,0,1,1,0)},
    {"nombre":"Infusion de hoja de naranja",            "cat":"bebidas","n":_n(1,0,0,0.3,0,3,0,1,3,0)},
    {"nombre":"Te de romero",                           "cat":"bebidas","n":_n(2,0,0,0.4,0,4,0.1,1,0,0)},
    {"nombre":"Te de menta",                            "cat":"bebidas","n":_n(1,0,0,0.2,0,5,0.1,3,2,0)},
    {"nombre":"Te helado sin azucar",                   "cat":"bebidas","n":_n(1,0,0,0.2,0,0,0,3,0,0)},
    {"nombre":"Te helado con azucar",                   "cat":"bebidas","n":_n(35,0,0,8.8,0,0,0,3,0,0)},
    # -- Cafes --
    {"nombre":"Cafe negro espresso",                    "cat":"bebidas","n":_n(1,0.1,0,0,0,2,0,2,0,0)},
    {"nombre":"Cafe negro filtrado",                    "cat":"bebidas","n":_n(1,0.1,0,0,0,2,0,2,0,0)},
    {"nombre":"Cafe negro instantaneo preparado",       "cat":"bebidas","n":_n(2,0.2,0,0.1,0,3,0,4,0,0)},
    {"nombre":"Cafe con azucar",                        "cat":"bebidas","n":_n(20,0.1,0,5.0,0,2,0,2,0,0)},
    {"nombre":"Cafe con leche entera",                  "cat":"bebidas","n":_n(55,2.8,2.5,5.5,0,90,0.1,40,0.5,0.3)},
    {"nombre":"Cafe con leche descremada",              "cat":"bebidas","n":_n(35,3.2,0.2,5.0,0,100,0,45,0.5,0.3)},
    {"nombre":"Cafe con leche condensada",              "cat":"bebidas","n":_n(75,2.0,1.5,13.5,0,65,0.1,35,0,0.2)},
    {"nombre":"Cafe americano diluido",                 "cat":"bebidas","n":_n(3,0.1,0,0.1,0,2,0,2,0,0)},
    {"nombre":"Cafe latte leche entera",                "cat":"bebidas","n":_n(60,3.0,2.8,6.0,0,95,0.1,42,0.5,0.3)},
    {"nombre":"Cafe latte leche descremada",            "cat":"bebidas","n":_n(38,3.5,0.2,5.5,0,105,0,48,0.5,0.3)},
    {"nombre":"Cafe cappuccino",                        "cat":"bebidas","n":_n(75,3.5,3.5,7.0,0,95,0.1,42,0,0.3)},
    {"nombre":"Cafe frio cold brew",                    "cat":"bebidas","n":_n(5,0.2,0,0.5,0,2,0,5,0,0)},
    # -- Leches --
    {"nombre":"Leche entera fluida",                    "cat":"bebidas","n":_n(61,3.2,3.3,4.5,0,113,0.03,40,0.4,0.4)},
    {"nombre":"Leche semidescremada 2 porciento",       "cat":"bebidas","n":_n(50,3.3,2.0,4.7,0,117,0.03,41,0.4,0.4)},
    {"nombre":"Leche descremada 0 porciento",           "cat":"bebidas","n":_n(35,3.4,0.2,5.0,0,119,0.02,44,0.5,0.4)},
    {"nombre":"Leche de soya fluida sin azucar",        "cat":"bebidas","n":_n(44,3.0,1.7,4.0,0.5,25,0.4,41,0,0.2)},
    {"nombre":"Leche de soya fluida con azucar",        "cat":"bebidas","n":_n(54,3.0,1.7,6.2,0.5,25,0.4,41,0,0.2)},
    {"nombre":"Leche de arroz fluida",                  "cat":"bebidas","n":_n(47,0.3,1.0,9.2,0,118,0.2,37,0,0)},
    {"nombre":"Leche de avena fluida",                  "cat":"bebidas","n":_n(45,1.0,1.5,6.5,0.3,120,0.2,60,0,0)},
    {"nombre":"Leche evaporada entera reconstituida",   "cat":"bebidas","n":_n(67,3.4,3.8,5.0,0,130,0.1,53,0.2,0.4)},
    {"nombre":"Leche de cabra fluida",                  "cat":"bebidas","n":_n(69,3.6,4.1,4.5,0,134,0.05,50,1.0,0.3)},
    # -- Malteadas y batidos --
    {"nombre":"Malteada de vainilla con leche",         "cat":"bebidas","n":_n(120,3.8,3.0,19.5,0,130,0.1,65,0.5,0.4)},
    {"nombre":"Malteada de chocolate con leche",        "cat":"bebidas","n":_n(125,3.9,3.3,20.5,0.3,125,0.3,75,0.5,0.5)},
    {"nombre":"Malteada de fresa con leche",            "cat":"bebidas","n":_n(118,3.7,2.9,19.5,0.1,125,0.1,60,3.0,0.4)},
    {"nombre":"Malteada de cafe con leche",             "cat":"bebidas","n":_n(122,3.8,3.0,20.0,0,125,0.2,65,0.5,0.4)},
    {"nombre":"Malteada de coco con leche",             "cat":"bebidas","n":_n(130,3.5,4.0,20.0,0.5,120,0.2,55,0.5,0.4)},
    {"nombre":"Batido de platano con leche",            "cat":"bebidas","n":_n(90,2.5,1.8,17.0,0.9,80,0.1,35,5.0,0.2)},
    {"nombre":"Batido de mango con leche",              "cat":"bebidas","n":_n(85,2.4,1.7,15.5,0.5,75,0.1,32,18.0,0.2)},
    {"nombre":"Batido de mamey con leche",              "cat":"bebidas","n":_n(100,2.5,2.0,18.5,1.0,75,0.3,35,10.0,0.2)},
    {"nombre":"Batido de papaya con leche",             "cat":"bebidas","n":_n(75,2.3,1.5,13.5,0.7,75,0.1,30,30.0,0.2)},
    {"nombre":"Batido de guayaba con leche",            "cat":"bebidas","n":_n(80,2.5,1.6,14.5,1.5,75,0.2,30,80.0,0.2)},
    {"nombre":"Licuado de avena con leche",             "cat":"bebidas","n":_n(95,3.0,2.0,16.5,0.8,100,0.5,50,0.5,0.3)},
    # -- Jugos naturales --
    {"nombre":"Jugo de naranja natural",                "cat":"bebidas","n":_n(45,0.7,0.2,10.4,0.2,11,0.2,1,50,0.1)},
    {"nombre":"Jugo de limon natural",                  "cat":"bebidas","n":_n(25,0.4,0.3,5.8,0.3,9,0.1,1,38,0.1)},
    {"nombre":"Jugo de mango natural",                  "cat":"bebidas","n":_n(54,0.4,0.4,13.1,0.3,9,0.1,3,18,0.1)},
    {"nombre":"Jugo de pina natural",                   "cat":"bebidas","n":_n(50,0.4,0.1,12.1,0.2,11,0.2,1,15,0.1)},
    {"nombre":"Jugo de papaya natural",                 "cat":"bebidas","n":_n(39,0.6,0.1,9.8,0.4,20,0.1,6,60,0.1)},
    {"nombre":"Jugo de sandia natural",                 "cat":"bebidas","n":_n(30,0.6,0.2,7.5,0.2,7,0.2,1,8,0.1)},
    {"nombre":"Jugo de melon natural",                  "cat":"bebidas","n":_n(34,0.8,0.2,8.1,0.4,9,0.2,16,37,0.1)},
    {"nombre":"Jugo de guayaba natural",                "cat":"bebidas","n":_n(39,0.6,0.5,9.0,1.0,18,0.3,2,80,0.2)},
    {"nombre":"Jugo de maracuya natural",               "cat":"bebidas","n":_n(51,0.7,0.4,13.0,0.4,12,0.6,28,30,0.1)},
    {"nombre":"Jugo de toronja natural",                "cat":"bebidas","n":_n(39,0.5,0.1,9.2,0.1,9,0.1,1,38,0.1)},
    {"nombre":"Jugo de zanahoria natural",              "cat":"bebidas","n":_n(40,0.9,0.2,9.3,0.8,30,0.4,69,6,0.1)},
    {"nombre":"Jugo de tomate natural",                 "cat":"bebidas","n":_n(17,0.8,0.1,4.2,0.4,9,0.4,10,18,0.1)},
    {"nombre":"Jugo de remolacha natural",              "cat":"bebidas","n":_n(43,1.6,0.2,10.0,2.0,16,0.8,78,5,0.3)},
    {"nombre":"Jugo de nance natural",                  "cat":"bebidas","n":_n(38,0.4,0.5,9.1,0.5,15,0.2,3,65,0.1)},
    {"nombre":"Jugo de jocote natural",                 "cat":"bebidas","n":_n(65,0.5,0.3,15.5,0.6,8,0.2,4,25,0.1)},
    {"nombre":"Jugo de tamarindo natural",              "cat":"bebidas","n":_n(48,0.5,0.1,12.5,0.3,8,0.3,5,2,0.1)},
    {"nombre":"Jugo mixto tropical",                    "cat":"bebidas","n":_n(55,0.5,0.2,13.0,0.3,10,0.2,5,25,0.1)},
    {"nombre":"Jugo de cana natural guarapo",           "cat":"bebidas","n":_n(65,0.2,0,16.0,0,10,0.3,8,1,0.1)},
    # -- Bebidas tradicionales Honduras/CA --
    {"nombre":"Pinol bebida de maiz tostado",           "cat":"bebidas","n":_n(70,1.8,0.8,15.5,0.5,8,0.4,5,0,0.2)},
    {"nombre":"Pinolillo cacao y maiz tostado",         "cat":"bebidas","n":_n(75,2.0,1.5,14.5,0.8,12,0.6,5,0,0.3)},
    {"nombre":"Horchata de morro",                      "cat":"bebidas","n":_n(85,2.0,2.5,14.5,0.3,45,0.5,8,2,0.3)},
    {"nombre":"Horchata de arroz",                      "cat":"bebidas","n":_n(90,1.5,1.0,18.5,0.2,30,0.2,10,0,0.1)},
    {"nombre":"Atol de elote maiz tierno",              "cat":"bebidas","n":_n(120,2.5,1.5,24.0,0.5,40,0.5,20,3,0.3)},
    {"nombre":"Atol de maiz mazamorra",                 "cat":"bebidas","n":_n(110,2.0,0.8,23.5,0.4,30,0.4,15,0,0.2)},
    {"nombre":"Atol de avena con leche",                "cat":"bebidas","n":_n(100,3.5,1.8,18.5,0.8,85,0.5,40,0.5,0.3)},
    {"nombre":"Atol de arroz con leche",                "cat":"bebidas","n":_n(95,2.8,1.5,18.0,0.2,80,0.2,35,0.5,0.2)},
    {"nombre":"Atol de platano",                        "cat":"bebidas","n":_n(85,1.5,0.5,20.0,0.7,20,0.3,10,5,0.1)},
    {"nombre":"Chicha de maiz sin fermentar",           "cat":"bebidas","n":_n(55,1.0,0.3,12.5,0.2,10,0.3,5,0,0.1)},
    {"nombre":"Chicha de maiz fermentada",              "cat":"bebidas","n":_n(40,0.5,0.2,5.5,0.2,8,0.2,3,0,0.1)},
    {"nombre":"Pozol de maiz",                          "cat":"bebidas","n":_n(75,1.5,0.5,16.5,0.4,12,0.3,8,0,0.2)},
    {"nombre":"Tiste de cacao y maiz",                  "cat":"bebidas","n":_n(100,2.5,3.0,17.5,0.8,25,0.8,10,0,0.4)},
    {"nombre":"Chocolate caliente con leche entera",    "cat":"bebidas","n":_n(90,3.0,2.8,12.5,0.5,95,0.5,45,0,0.4)},
    {"nombre":"Cocoa caliente con leche",               "cat":"bebidas","n":_n(85,2.8,1.5,14.0,0.7,95,0.6,50,0,0.4)},
    {"nombre":"Fresco de avena con leche",              "cat":"bebidas","n":_n(80,2.5,1.5,14.5,0.5,80,0.4,40,0.5,0.3)},
    {"nombre":"Fresco de cebada con leche",             "cat":"bebidas","n":_n(85,2.8,1.5,15.0,0.3,80,0.3,40,0.5,0.3)},
    {"nombre":"Ponche de frutas casero",                "cat":"bebidas","n":_n(60,0.3,0.1,15.0,0.2,8,0.2,3,15,0.1)},
    {"nombre":"Refresco de coco natural",               "cat":"bebidas","n":_n(45,0.5,1.0,10.0,0.5,15,0.2,20,3,0.1)},
    {"nombre":"Refresco de maracuya con azucar",        "cat":"bebidas","n":_n(50,0.5,0.2,12.5,0.3,10,0.4,25,20,0.1)},
    {"nombre":"Refresco de jocote con azucar",          "cat":"bebidas","n":_n(50,0.3,0.2,12.0,0.4,6,0.2,4,15,0.1)},
    {"nombre":"Refresco de nance con azucar",           "cat":"bebidas","n":_n(48,0.3,0.3,11.5,0.4,12,0.2,3,45,0.1)},
    # -- Industriales comunes --
    {"nombre":"Refresco gaseoso cola regular",          "cat":"bebidas","n":_n(44,0,0,11.0,0,2,0,10,0,0)},
    {"nombre":"Refresco gaseoso cola sin azucar",       "cat":"bebidas","n":_n(0,0,0,0,0,2,0,25,0,0)},
    {"nombre":"Refresco gaseoso naranja",               "cat":"bebidas","n":_n(48,0,0,12.0,0,4,0,10,0,0)},
    {"nombre":"Refresco gaseoso lima limon",            "cat":"bebidas","n":_n(43,0,0,10.6,0,4,0,12,0,0)},
    {"nombre":"Bebida deportiva reidratante",           "cat":"bebidas","n":_n(26,0,0,6.5,0,4,0,90,0,0)},
    {"nombre":"Bebida energizante regular",             "cat":"bebidas","n":_n(45,0,0,11.2,0,0,0,80,0,0)},
    {"nombre":"Nectar de melocoton enlatado",           "cat":"bebidas","n":_n(50,0.4,0.1,12.5,0.3,4,0.2,8,30,0)},
    {"nombre":"Nectar de mango enlatado",               "cat":"bebidas","n":_n(53,0.4,0.2,13.0,0.3,8,0.2,8,12,0.1)},
    {"nombre":"Jugo de naranja pasteurizado",           "cat":"bebidas","n":_n(45,0.7,0.2,10.4,0.2,11,0.2,1,50,0.1)},
    {"nombre":"Leche saborizada chocolate envasada",    "cat":"bebidas","n":_n(85,3.2,2.5,12.5,0.2,105,0.3,60,0.5,0.4)},
    # -- Caldos --
    {"nombre":"Caldo de pollo casero",    "cat":"sopas_salsas","n":_n(15,1.5,0.5,0.5,0,8,0.3,200,0,0.2)},
    {"nombre":"Caldo de res casero",      "cat":"sopas_salsas","n":_n(20,2.0,0.8,0.8,0,5,0.5,220,0,0.3)},
    {"nombre":"Caldo de vegetales casero","cat":"sopas_salsas","n":_n(12,0.5,0.2,2.5,0.3,15,0.3,180,5,0.1)},
    {"nombre":"Caldo de frijoles",        "cat":"sopas_salsas","n":_n(35,2.0,0.5,6.5,1.5,20,0.8,150,0,0.3)},
    # -- Bebidas alcoholicas --
    {"nombre":"Cerveza regular hondurena 5 porciento","cat":"bebidas_alcoholicas","n":_n(43,0.5,0,3.6,0,5,0,4,0,0)},
    {"nombre":"Cerveza light hondurena 4 porciento",  "cat":"bebidas_alcoholicas","n":_n(29,0.3,0,1.7,0,4,0,4,0,0)},
    {"nombre":"Vino tinto 12 porciento",              "cat":"bebidas_alcoholicas","n":_n(85,0.1,0,2.7,0,8,0.5,4,0,0.1)},
    {"nombre":"Vino blanco 12 porciento",             "cat":"bebidas_alcoholicas","n":_n(82,0.1,0,2.6,0,9,0.3,5,0,0.1)},
    {"nombre":"Aguardiente guaro 30 porciento",       "cat":"bebidas_alcoholicas","n":_n(173,0,0,0,0,0,0,0,0,0)},
    {"nombre":"Ron 40 porciento",                     "cat":"bebidas_alcoholicas","n":_n(231,0,0,0,0,0,0,0,0,0)},
    # -- Platillos tipicos --
    {"nombre":"Baleada sencilla tortilla frijoles crema","cat":"platillos_preparados","n":_n(285,9.0,8.5,43.0,5.0,85,2.0,350,1,0.8)},
    {"nombre":"Baleada especial con queso y huevo",      "cat":"platillos_preparados","n":_n(380,15.5,13.0,45.0,5.0,140,2.5,480,1,1.2)},
    {"nombre":"Plato tipico hondureno completo",         "cat":"platillos_preparados","n":_n(650,28.0,18.0,85.0,9.0,120,5.0,680,5,3.0)},
    {"nombre":"Sopa de res hondurena",                   "cat":"sopas_salsas","n":_n(180,12.0,5.5,22.0,3.5,45,2.5,420,8,2.0)},
    {"nombre":"Sopa de pollo hondurena",                 "cat":"sopas_salsas","n":_n(120,10.0,3.5,14.0,2.5,30,1.5,380,6,1.2)},
    {"nombre":"Sopa de caracol con coco",                "cat":"sopas_salsas","n":_n(85,8.5,2.5,8.5,1.0,65,1.8,290,3,1.5)},
    {"nombre":"Mondongo hondureno",                      "cat":"sopas_salsas","n":_n(95,8.0,2.5,10.5,1.5,55,1.5,350,5,1.5)},
    {"nombre":"Tamales hondurenos de maiz",              "cat":"panificados","n":_n(190,5.5,7.0,27.5,2.5,40,1.8,380,1,0.8)},
    {"nombre":"Nacatamales de puerco",                   "cat":"platillos_preparados","n":_n(220,8.0,9.5,28.5,2.5,45,2.0,420,1,1.0)},
    {"nombre":"Frijoles volteados refritos",             "cat":"leguminosas","n":_n(130,7.0,3.5,18.5,5.5,42,2.5,280,0,0.9)},
    {"nombre":"Frijoles parados cocidos con caldo",      "cat":"leguminosas","n":_n(125,7.5,1.5,21.0,7.0,45,3.0,200,0,1.0)},
    {"nombre":"Arroz con pollo hondureno",               "cat":"platillos_preparados","n":_n(170,10.5,4.0,23.5,0.8,25,1.5,320,3,1.0)},
    {"nombre":"Arroz blanco cocido sin sal",             "cat":"cereales_granos","n":_n(130,2.7,0.3,28.5,0.4,10,0.2,1,0,0.5)},
    {"nombre":"Tajadas de platano verde frito",          "cat":"frutas","n":_n(200,1.5,8.0,31.0,2.0,5,0.5,120,10,0.2)},
    {"nombre":"Tajadas de platano maduro frito",         "cat":"frutas","n":_n(190,1.3,6.5,33.5,2.2,5,0.4,110,11,0.2)},
    {"nombre":"Tostadas con frijoles y queso",           "cat":"platillos_preparados","n":_n(240,9.5,7.5,33.5,4.0,95,2.0,420,1,1.0)},
    {"nombre":"Pupusas de queso",                        "cat":"platillos_preparados","n":_n(220,7.5,7.5,31.0,2.0,85,1.5,350,0.5,0.8)},
    {"nombre":"Enchiladas hondurenas",                   "cat":"platillos_preparados","n":_n(280,10.5,10.0,37.0,3.5,65,2.5,450,5,1.2)},
    {"nombre":"Pastelitos de carne hondurenos",          "cat":"platillos_preparados","n":_n(250,8.5,11.0,31.0,1.5,30,2.0,420,2,1.0)},
    {"nombre":"Chicharrones de cerdo",                   "cat":"carnes_cerdo","n":_n(545,28.5,48.5,0,0,30,1.5,380,0,1.8)},
    {"nombre":"Tortilla de maiz nixtamalizada",          "cat":"cereales_granos","n":_n(218,5.7,1.1,45.7,5.2,127,1.7,7,0,0.5)},
    {"nombre":"Tortilla de maiz de comal",               "cat":"cereales_granos","n":_n(225,5.5,1.0,47.0,5.0,120,1.5,5,0,0.5)},
    {"nombre":"Masa de maiz nixtamalizado",              "cat":"cereales_granos","n":_n(147,3.8,0.9,30.0,3.5,85,1.2,5,0,0.4)},
    {"nombre":"Maiz tostado",                            "cat":"cereales_granos","n":_n(385,9.5,5.0,79.0,7.2,7,2.5,5,0,1.8)},
    {"nombre":"Casamiento arroz con frijoles",           "cat":"platillos_preparados","n":_n(130,5.5,1.5,24.5,3.5,25,1.8,180,0,0.7)},
    {"nombre":"Catrachitas tajadas frijoles queso",      "cat":"platillos_preparados","n":_n(210,7.5,7.0,30.5,3.0,80,1.8,380,3,0.9)},
    {"nombre":"Sopa de frijoles negros",                 "cat":"sopas_salsas","n":_n(90,5.5,2.0,14.5,5.5,35,2.5,320,0,0.8)},
    {"nombre":"Arroz con leche hondureno",               "cat":"dulces_azucares","n":_n(165,3.5,3.5,30.0,0.2,90,0.2,55,0.5,0.3)},
    {"nombre":"Pan de yema hondureno",                   "cat":"panificados","n":_n(380,8.5,12.5,60.0,1.5,45,2.0,320,0,0.8)},
    {"nombre":"Tortilla de harina de trigo",             "cat":"panificados","n":_n(303,7.8,7.2,50.5,2.0,115,2.5,490,0,0.5)},
    # -- Frutas locales --
    {"nombre":"Nance maduro",       "cat":"frutas","n":_n(36,0.4,0.5,8.8,1.8,15,0.2,3,65,0.1)},
    {"nombre":"Jocote maduro",      "cat":"frutas","n":_n(76,0.5,0.3,19.2,1.2,8,0.2,4,25,0.1)},
    {"nombre":"Jocote verde",       "cat":"frutas","n":_n(40,0.5,0.2,9.5,1.5,8,0.2,4,15,0.1)},
    {"nombre":"Guanabana soursop",  "cat":"frutas","n":_n(65,1.0,0.3,16.8,3.3,14,0.6,14,21,0.1)},
    {"nombre":"Mamey colorado",     "cat":"frutas","n":_n(97,1.5,0.4,24.0,5.4,16,0.5,7,18,0.2)},
    {"nombre":"Maranon fruto fresco","cat":"frutas","n":_n(73,1.3,0.5,16.8,0.9,45,0.3,5,218,0.2)},
    {"nombre":"Carambola",          "cat":"frutas","n":_n(31,1.0,0.3,6.7,2.8,3,0.1,2,34,0.1)},
    {"nombre":"Pitahaya roja",      "cat":"frutas","n":_n(36,0.4,0.1,9.2,1.0,18,0.3,39,9,0.1)},
    {"nombre":"Zapote negro",       "cat":"frutas","n":_n(80,0.8,0.2,20.0,1.2,10,0.3,2,20,0.2)},
    {"nombre":"Noni morinda",       "cat":"frutas","n":_n(47,1.1,0.1,11.3,0,20,0.5,9,33,0.1)},
    {"nombre":"Anona chirimoya local","cat":"frutas","n":_n(75,1.7,0.7,17.7,2.4,30,0.7,7,13,0.2)},
    {"nombre":"Platano verde crudo","cat":"frutas","n":_n(89,1.3,0.4,22.8,2.6,3,0.6,4,18,0.1)},
    {"nombre":"Platano maduro crudo","cat":"frutas","n":_n(100,1.2,0.2,24.8,2.1,5,0.4,1,12,0.2)},
    # -- Verduras locales --
    {"nombre":"Guisquil chayote crudo",   "cat":"verduras","n":_n(25,0.8,0.1,5.9,1.7,17,0.3,2,8,0.1)},
    {"nombre":"Guisquil chayote cocido",  "cat":"verduras","n":_n(22,0.5,0.1,5.3,1.5,14,0.3,2,7,0.1)},
    {"nombre":"Chipilin hojas",           "cat":"verduras","n":_n(60,5.5,1.0,8.5,3.5,320,3.2,25,40,0.5)},
    {"nombre":"Loroco flor",              "cat":"verduras","n":_n(35,3.5,0.5,5.5,2.5,45,1.5,15,25,0.4)},
    {"nombre":"Hierba santa hoja",        "cat":"verduras","n":_n(45,4.0,0.8,7.5,3.0,180,5.5,10,15,0.5)},
    {"nombre":"Ayote tierno calabaza criolla","cat":"verduras","n":_n(28,0.9,0.2,6.5,2.0,20,0.4,2,12,0.2)},
    {"nombre":"Quilete hoja silvestre",   "cat":"verduras","n":_n(40,3.5,0.8,6.0,3.5,150,3.0,15,30,0.4)},
    {"nombre":"Bledo amaranto hojas",     "cat":"verduras","n":_n(42,4.0,0.7,6.8,3.0,280,3.5,25,45,0.6)},
    {"nombre":"Pacaya flor de palma",     "cat":"verduras","n":_n(60,2.5,0.3,12.5,3.5,50,1.2,10,8,0.3)},
    {"nombre":"Yuca cocida sin sal",      "cat":"verduras","n":_n(160,1.4,0.3,38.1,1.8,16,0.3,14,21,0.4)},
    {"nombre":"Malanga taro cocida",      "cat":"verduras","n":_n(115,1.5,0.2,27.9,4.1,18,0.6,11,5,0.2)},
    {"nombre":"Camote batata cocido",     "cat":"verduras","n":_n(90,2.0,0.1,20.7,3.3,30,0.6,36,20,0.3)},
    # -- Granos y leguminosas --
    {"nombre":"Frijoles rojos cocidos sin sal","cat":"leguminosas","n":_n(125,7.8,0.4,22.8,6.3,46,2.8,5,0,1.0)},
    {"nombre":"Frijoles negros cocidos",      "cat":"leguminosas","n":_n(132,8.9,0.5,23.7,8.7,27,3.6,2,0,1.2)},
    {"nombre":"Frijoles blancos cocidos",     "cat":"leguminosas","n":_n(139,9.6,0.4,25.1,6.3,113,2.5,2,0,1.4)},
    {"nombre":"Lentejas cocidas sin sal",     "cat":"leguminosas","n":_n(116,9.0,0.4,20.1,7.9,19,3.3,2,1.5,1.3)},
    {"nombre":"Garbanzo cocido",              "cat":"leguminosas","n":_n(164,8.9,2.6,27.4,7.6,49,2.9,7,1.3,1.5)},
    {"nombre":"Maiz grano seco crudo",        "cat":"cereales_granos","n":_n(365,9.4,4.7,74.3,7.3,7,2.7,35,0,2.2)},
    {"nombre":"Maiz blanco cocido pozole",    "cat":"cereales_granos","n":_n(102,3.0,1.2,22.0,3.0,4,0.6,1,0,0.6)},
    # -- Comidas rapidas --
    {"nombre":"Hamburguesa con queso local", "cat":"comida_rapida","n":_n(295,15.5,13.5,28.5,1.5,125,2.5,520,3,2.0)},
    {"nombre":"Pollo frito con tajadas",     "cat":"comida_rapida","n":_n(310,22.0,16.0,22.0,2.5,20,1.5,480,5,1.5)},
    {"nombre":"Hot dog en bun con mostaza",  "cat":"comida_rapida","n":_n(265,10.5,14.5,25.0,1.0,55,1.8,680,1,1.2)},
]


# ---------------------------------------------------------------------------
# USDA
# ---------------------------------------------------------------------------
def load_usda_foods():
    print("  Leyendo food.csv ...", flush=True)
    food = pd.read_csv(CSV_DIR/"food.csv",
                       usecols=["fdc_id","description","data_type","food_category_id"],
                       low_memory=False)
    result = food[food["data_type"].isin(DATA_TYPES_OK)].copy()
    result["food_category_id"] = pd.to_numeric(result["food_category_id"], errors="coerce")
    print(f"  {len(result):,} alimentos USDA no-branded", flush=True)
    return result

def load_usda_nutrients(fdc_ids):
    nut_ids = set(NUTRIENT_MAP.keys())
    chunks = []
    print(f"  Filtrando food_nutrient.csv ({len(fdc_ids):,} IDs) ...", flush=True)
    for chunk in pd.read_csv(CSV_DIR/"food_nutrient.csv",
                              usecols=["fdc_id","nutrient_id","amount"],
                              chunksize=1_000_000,
                              dtype={"fdc_id":"int64","nutrient_id":"int64","amount":"float32"}):
        f = chunk[chunk["fdc_id"].isin(fdc_ids) & chunk["nutrient_id"].isin(nut_ids)]
        if not f.empty: chunks.append(f)
    if not chunks:
        return pd.DataFrame(columns=["fdc_id","nutrient_id","amount"])
    df = pd.concat(chunks, ignore_index=True)
    df = df.drop_duplicates(subset=["fdc_id","nutrient_id"])
    piv = df.pivot(index="fdc_id", columns="nutrient_id", values="amount").reset_index()
    piv.columns.name = None
    return piv

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    alimentos = []

    # 1. USDA
    print("\n=== USDA FoodData Central ===", flush=True)
    foods = load_usda_foods()
    fdc_ids = set(foods["fdc_id"].astype(int))
    pivoted = load_usda_nutrients(fdc_ids)
    foods["fdc_id"] = foods["fdc_id"].astype(int)
    merged = foods.merge(pivoted, on="fdc_id", how="left")
    print(f"  Merge: {len(merged):,} alimentos", flush=True)
    for _, row in merged.iterrows():
        nutrientes = {key: (_v(row.get(nid)) if pd.notna(row.get(nid)) else None)
                      for nid, key in NUTRIENT_MAP.items()}
        alimentos.append({"nombre": row["description"],
                           "categoria": _cat(row.get("food_category_id")),
                           "fuente": "USDA_FDC",
                           "fdc_id": int(row["fdc_id"]),
                           "nutrientes_por_100g": nutrientes})

    # 2. INCAP
    print("\n=== INCAP-Tablas.pdf ===", flush=True)
    for r in build_incap():
        n = r["n"]
        alimentos.append({"nombre": r["nombre"], "categoria": r["categoria"],
                           "fuente": "INCAP", "incap_code": r["code"],
                           "nutrientes_por_100g": {
                               "energia_kcal": n.get("energia_kcal"),
                               "proteina_g":   n.get("proteina_g"),
                               "grasa_g":      n.get("grasa_g"),
                               "carbohidratos_g": n.get("carbohidratos_g"),
                               "fibra_g":      n.get("fibra_g"),
                               "calcio_mg":    n.get("calcio_mg"),
                               "hierro_mg":    n.get("hierro_mg"),
                               "sodio_mg":     n.get("sodio_mg"),
                               "vitamina_c_mg": n.get("vitamina_c_mg"),
                               "zinc_mg":      n.get("zinc_mg"),
                           }})

    # 3. Manual
    print(f"\n=== Manual Honduras/CA: {len(MANUAL)} ===", flush=True)
    for item in MANUAL:
        alimentos.append({"nombre": item["nombre"], "categoria": item["cat"],
                           "fuente": "manual_honduras",
                           "nutrientes_por_100g": item["n"]})

    # 4. Guardar
    print("\nGuardando ...", flush=True)
    output_list = [{"id": f"ALI{i:05d}", **a} for i, a in enumerate(alimentos, 1)]
    OUT_FILE.write_text(json.dumps({"alimentos": output_list}, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    u = sum(1 for a in alimentos if a.get("fuente")=="USDA_FDC")
    ic = sum(1 for a in alimentos if a.get("fuente")=="INCAP")
    m = sum(1 for a in alimentos if a.get("fuente")=="manual_honduras")
    total = len(output_list)
    print(f"\nTotal: {total:,} alimentos -> {OUT_FILE}")
    print(f"  USDA FDC:        {u:,}")
    print(f"  INCAP:           {ic:,}")
    print(f"  Manual Honduras: {m:,}")
    print(f"  Expansion vs 7485: {round(total/7485*100)}%")

if __name__ == "__main__":
    main()
