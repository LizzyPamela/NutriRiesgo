// ── Guías nutricionales por condición de salud ────────────────────────────────
// Basadas en: OMS, INCAP, American Heart Association, ADA (2024)

export interface GuiaMacronutriente {
  min?: number;
  max?: number;
  recomendacion: string;
}

export interface GuiaNutricional {
  id: string;
  nombre: string;
  condiciones: string[];
  macronutrientes: {
    carbohidratos: GuiaMacronutriente;
    proteinas: GuiaMacronutriente;
    grasas: GuiaMacronutriente;
    grasas_saturadas?: GuiaMacronutriente;
    fibra?: GuiaMacronutriente;
    sodio?: GuiaMacronutriente;
  };
  alimentos_recomendados: { categoria: string; items: string[] }[];
  alimentos_limitar: { categoria: string; items: string[] }[];
  distribucion_comidas: Record<string, number>;
  consejos: string[];
}

export const GUIAS: GuiaNutricional[] = [
  // ── Diabetes Mellitus Tipo 2 ─────────────────────────────────────────────
  {
    id: 'diabetes_tipo2',
    nombre: 'Diabetes Mellitus Tipo 2',
    condiciones: ['diabetes'],
    macronutrientes: {
      carbohidratos: { min: 45, max: 60, recomendacion: 'Preferir complejos; <10% azúcares simples' },
      proteinas:     { min: 15, max: 20, recomendacion: '0.8-1.0 g/kg peso corporal' },
      grasas:        { min: 25, max: 35, recomendacion: 'Priorizar insaturadas' },
      grasas_saturadas: { max: 7,  recomendacion: '<7% del valor calórico total' },
      fibra:         { min: 14,         recomendacion: '14 g por cada 1,000 kcal' },
      sodio:         { max: 2300,       recomendacion: '<2,300 mg/día' },
    },
    alimentos_recomendados: [
      { categoria: 'Cereales integrales', items: ['Tortilla de maíz', 'Arroz integral', 'Avena', 'Pan integral', 'Quinoa'] },
      { categoria: 'Verduras', items: ['Brócoli', 'Espinaca', 'Lechuga', 'Pepino', 'Chayote', 'Güisquil', 'Tomate', 'Coliflor'] },
      { categoria: 'Frutas (porciones moderadas)', items: ['Manzana', 'Pera', 'Naranja', 'Toronja', 'Fresas', 'Papaya', 'Melón'] },
      { categoria: 'Proteínas magras', items: ['Pescado (tilapia, atún)', 'Pechuga de pollo', 'Pavo', 'Huevos', 'Queso fresco bajo en grasa', 'Yogur natural sin azúcar'] },
      { categoria: 'Leguminosas', items: ['Frijoles negros', 'Frijoles rojos', 'Lentejas', 'Garbanzos'] },
      { categoria: 'Grasas saludables', items: ['Aguacate', 'Aceite de oliva', 'Nueces', 'Almendras', 'Chía', 'Linaza'] },
    ],
    alimentos_limitar: [
      { categoria: 'Azúcares y dulces', items: ['Azúcar blanca/morena', 'Miel', 'Refrescos', 'Jugos procesados', 'Pasteles', 'Galletas', 'Helados', 'Atoles dulces'] },
      { categoria: 'Harinas refinadas', items: ['Pan blanco', 'Tortilla de harina blanca', 'Pasta blanca', 'Cereales azucarados'] },
      { categoria: 'Grasas no saludables', items: ['Mantequilla', 'Manteca', 'Crema', 'Embutidos', 'Chicharrón', 'Frituras'] },
    ],
    distribucion_comidas: { desayuno: 20, merienda_manana: 15, almuerzo: 30, merienda_tarde: 10, cena: 25 },
    consejos: [
      'Realizar 5 comidas al día para mantener glucemia estable',
      'No saltarse el desayuno',
      'Combinar carbohidratos con proteína o grasa saludable en cada comida',
      'Preferir alimentos de índice glucémico bajo',
      'Hidratarse con agua natural (evitar bebidas azucaradas)',
      'Monitorear la glucemia según indicación médica',
      'Actividad física aeróbica ≥150 min/semana',
    ],
  },

  // ── Hipertensión Arterial ─────────────────────────────────────────────────
  {
    id: 'hipertension',
    nombre: 'Hipertensión Arterial',
    condiciones: ['hipertension'],
    macronutrientes: {
      carbohidratos: { min: 50, max: 60, recomendacion: 'Preferir integrales' },
      proteinas:     { min: 15, max: 20, recomendacion: 'Fuentes magras' },
      grasas:        { min: 25, max: 30, recomendacion: 'Monoinsaturadas y poliinsaturadas' },
      grasas_saturadas: { max: 7, recomendacion: '<7% del valor calórico total' },
      sodio:         { max: 1500, recomendacion: 'Idealmente <1,500 mg/día (dieta DASH)' },
    },
    alimentos_recomendados: [
      { categoria: 'Frutas ricas en potasio', items: ['Plátano', 'Melón', 'Aguacate', 'Naranja', 'Papaya', 'Fresas', 'Arándanos'] },
      { categoria: 'Verduras', items: ['Espinaca', 'Brócoli', 'Acelgas', 'Ajo', 'Cebolla', 'Apio', 'Remolacha', 'Chayote'] },
      { categoria: 'Cereales integrales', items: ['Avena', 'Arroz integral', 'Quinoa', 'Pan integral', 'Tortilla de maíz'] },
      { categoria: 'Proteínas magras', items: ['Salmón', 'Atún', 'Sardinas', 'Pechuga de pollo', 'Pavo', 'Claras de huevo', 'Lácteos descremados'] },
      { categoria: 'Legumbres y frutos secos', items: ['Frijoles', 'Lentejas', 'Garbanzos', 'Nueces sin sal', 'Almendras sin sal'] },
    ],
    alimentos_limitar: [
      { categoria: 'Alimentos altos en sodio', items: ['Sal de mesa', 'Alimentos enlatados', 'Sopas instantáneas', 'Consomés en cubito', 'Salsas comerciales', 'Salsa de soya'] },
      { categoria: 'Embutidos', items: ['Jamón', 'Salchicha', 'Tocino', 'Chorizo', 'Salami'] },
      { categoria: 'Comidas rápidas', items: ['Hamburguesas', 'Pizza', 'Hot dogs', 'Papas fritas', 'Nuggets'] },
    ],
    distribucion_comidas: { desayuno: 25, merienda_manana: 10, almuerzo: 30, merienda_tarde: 10, cena: 25 },
    consejos: [
      'Seguir la dieta DASH (Dietary Approaches to Stop Hypertension)',
      'No agregar sal a las comidas; usar hierbas y especias para dar sabor',
      'Leer etiquetas: evitar alimentos con >200 mg sodio por porción',
      'Aumentar potasio (frutas, verduras, legumbres)',
      'Limitar alcohol y cafeína',
      'Mantener peso saludable',
      'Actividad física moderada ≥30 min/día',
    ],
  },

  // ── Dislipidemia ──────────────────────────────────────────────────────────
  {
    id: 'dislipidemia',
    nombre: 'Dislipidemia (Colesterol elevado)',
    condiciones: ['dislipidemia'],
    macronutrientes: {
      carbohidratos: { min: 45, max: 60, recomendacion: 'Preferir integrales, limitar refinados' },
      proteinas:     { min: 15, max: 20, recomendacion: 'Fuentes vegetales y pescado' },
      grasas:        { min: 25, max: 35, recomendacion: 'Monoinsaturadas y omega-3; eliminar trans' },
      grasas_saturadas: { max: 6, recomendacion: '<6% del valor calórico total' },
      fibra:         { min: 25, recomendacion: '25-30 g/día (énfasis en fibra soluble)' },
    },
    alimentos_recomendados: [
      { categoria: 'Fuentes de omega-3', items: ['Salmón', 'Atún', 'Sardinas', 'Macarela', 'Chía', 'Linaza', 'Nueces'] },
      { categoria: 'Fibra soluble', items: ['Avena', 'Cebada', 'Frijoles', 'Manzana', 'Naranja', 'Psyllium'] },
      { categoria: 'Grasas saludables', items: ['Aceite de oliva', 'Aguacate', 'Almendras', 'Nueces', 'Aceite de canola'] },
      { categoria: 'Frutas y verduras antioxidantes', items: ['Arándanos', 'Fresas', 'Espinaca', 'Brócoli', 'Tomate', 'Zanahoria'] },
      { categoria: 'Proteínas vegetales', items: ['Frijoles', 'Lentejas', 'Tofu', 'Edamame', 'Garbanzos'] },
    ],
    alimentos_limitar: [
      { categoria: 'Grasas saturadas y trans', items: ['Mantequilla', 'Manteca', 'Crema', 'Queso amarillo', 'Carnes rojas grasosas', 'Frituras', 'Margarinas sólidas'] },
      { categoria: 'Colesterol alto', items: ['Yema de huevo (máx 2-3/semana)', 'Vísceras', 'Mariscos en exceso'] },
      { categoria: 'Azúcares y refinados', items: ['Refrescos', 'Jugos procesados', 'Dulces', 'Pan blanco', 'Arroz blanco'] },
    ],
    distribucion_comidas: { desayuno: 20, merienda_manana: 15, almuerzo: 30, merienda_tarde: 10, cena: 25 },
    consejos: [
      'Eliminar completamente las grasas trans (margarinas, frituras industriales)',
      'Aumentar consumo de fibra soluble (avena, frijoles, manzana)',
      'Consumir pescado graso 2-3 veces por semana',
      'Reemplazar mantequilla por aceite de oliva',
      'Actividad física aeróbica aumenta el HDL (colesterol "bueno")',
      'Mantener peso saludable (el exceso eleva triglicéridos)',
    ],
  },

  // ── Sobrepeso / Obesidad ──────────────────────────────────────────────────
  {
    id: 'sobrepeso_obesidad',
    nombre: 'Sobrepeso y Obesidad',
    condiciones: ['sobrepeso', 'obesidad'],
    macronutrientes: {
      carbohidratos: { min: 45, max: 55, recomendacion: 'Reducir refinados; priorizar integrales' },
      proteinas:     { min: 20, max: 30, recomendacion: 'Mayor ingesta preserva masa muscular' },
      grasas:        { min: 25, max: 30, recomendacion: 'Grasas saludables en moderación' },
      fibra:         { min: 25,          recomendacion: '25-30 g/día para promover saciedad' },
    },
    alimentos_recomendados: [
      { categoria: 'Verduras de bajo índice calórico', items: ['Lechuga', 'Espinaca', 'Brócoli', 'Coliflor', 'Pepino', 'Apio', 'Champiñones', 'Tomate', 'Pimientos'] },
      { categoria: 'Proteínas magras', items: ['Pechuga de pollo', 'Pescado blanco', 'Claras de huevo', 'Atún en agua', 'Yogur griego sin grasa', 'Queso cottage'] },
      { categoria: 'Frutas con moderación', items: ['Manzana', 'Pera', 'Fresas', 'Frambuesas', 'Melón', 'Toronja'] },
      { categoria: 'Cereales integrales (porciones controladas)', items: ['Avena', 'Arroz integral', 'Quinoa', 'Pan integral (1-2 rebanadas/día)'] },
    ],
    alimentos_limitar: [
      { categoria: 'Azúcares y harinas refinadas', items: ['Pan blanco', 'Arroz blanco', 'Pasta blanca', 'Repostería', 'Galletas', 'Refrescos', 'Jugos'] },
      { categoria: 'Grasas no saludables', items: ['Frituras', 'Comida rápida', 'Mayonesa', 'Snacks de paquete'] },
      { categoria: 'Ultraprocesados', items: ['Embutidos', 'Comidas congeladas', 'Pizzas', 'Nuggets', 'Sopas instantáneas'] },
    ],
    distribucion_comidas: { desayuno: 25, merienda_manana: 10, almuerzo: 35, merienda_tarde: 10, cena: 20 },
    consejos: [
      'Déficit calórico gradual de 300-500 kcal/día (pérdida de 0.5-1 kg/semana)',
      'No saltarse comidas; respetar horarios regulares',
      'Beber 2-3 litros de agua al día (preferir antes de las comidas)',
      'Controlar tamaño de porciones; usar platos más pequeños',
      'Comer despacio (mínimo 20 minutos por comida)',
      'Registrar lo que se come para mayor conciencia',
      'Combinar cardio (≥150 min/semana) con ejercicios de fuerza (2-3 veces/semana)',
    ],
  },

  // ── Salud General ─────────────────────────────────────────────────────────
  {
    id: 'salud_general',
    nombre: 'Alimentación Saludable General',
    condiciones: ['general'],
    macronutrientes: {
      carbohidratos: { min: 45, max: 65, recomendacion: 'Preferir integrales' },
      proteinas:     { min: 10, max: 35, recomendacion: 'Variadas (animales y vegetales)' },
      grasas:        { min: 20, max: 35, recomendacion: 'Énfasis en insaturadas' },
      fibra:         { min: 25,          recomendacion: '25-30 g/día' },
      sodio:         { max: 2300,        recomendacion: '<2,300 mg/día' },
    },
    alimentos_recomendados: [
      { categoria: 'Todos los grupos en variedad', items: ['Frutas y verduras (5 porciones/día)', 'Cereales integrales', 'Proteínas variadas', 'Lácteos', 'Leguminosas', 'Frutos secos'] },
    ],
    alimentos_limitar: [
      { categoria: 'Consumir con moderación', items: ['Azúcares añadidos', 'Grasas saturadas', 'Sodio en exceso', 'Alcohol', 'Ultraprocesados'] },
    ],
    distribucion_comidas: { desayuno: 20, merienda_manana: 10, almuerzo: 35, merienda_tarde: 10, cena: 25 },
    consejos: [
      'Consumir al menos 5 porciones de frutas y verduras al día',
      'Variar los alimentos en cada comida',
      'Cocinar preferentemente al vapor, asado o hervido',
      'Hidratarse con agua (1.5-2 litros mínimo/día)',
      'Actividad física regular: ≥150 min/semana de intensidad moderada',
      'Dormir 7-8 horas diarias',
    ],
  },
];

/**
 * Retorna las guías aplicables según el perfil del usuario.
 */
export function obtenerGuiasAplicables(perfil: {
  tiene_diabetes?: boolean;
  tiene_hipertension?: boolean;
  tiene_dislipidemia?: boolean;
  imc?: number;
}): GuiaNutricional[] {
  const resultado: GuiaNutricional[] = [];

  if (perfil.tiene_diabetes)
    resultado.push(GUIAS.find(g => g.id === 'diabetes_tipo2')!);
  if (perfil.tiene_hipertension)
    resultado.push(GUIAS.find(g => g.id === 'hipertension')!);
  if (perfil.tiene_dislipidemia)
    resultado.push(GUIAS.find(g => g.id === 'dislipidemia')!);
  if (perfil.imc && perfil.imc >= 25)
    resultado.push(GUIAS.find(g => g.id === 'sobrepeso_obesidad')!);

  if (resultado.length === 0)
    resultado.push(GUIAS.find(g => g.id === 'salud_general')!);

  return resultado.filter(Boolean);
}
