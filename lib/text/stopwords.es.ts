// A standard list of ~100 common Spanish function words: articles,
// prepositions, conjunctions, common pronouns, and frequent auxiliary /
// copular verb forms. All entries are lowercase normalized tokens.
export const SPANISH_STOPWORDS: Set<string> = new Set([
  // Articles
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',

  // Prepositions
  'a', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante',
  'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'segun', 'según', 'sin',
  'sobre', 'tras',

  // Conjunctions
  'y', 'e', 'o', 'u', 'ni', 'que', 'pero', 'mas', 'más', 'sino', 'aunque',
  'porque', 'pues', 'si', 'como', 'cuando', 'mientras',

  // Personal pronouns
  'yo', 'tu', 'tú', 'el', 'ella', 'ello', 'nosotros', 'nosotras',
  'vosotros', 'vosotras', 'ellos', 'ellas', 'usted', 'ustedes',
  'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'la', 'los', 'las',
  'mi', 'mí', 'ti', 'si', 'sí', 'conmigo', 'contigo', 'consigo',

  // Possessives
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra', 'nuestros',
  'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras',

  // Demonstratives
  'este', 'esta', 'estos', 'estas', 'eso', 'esa', 'esas', 'ese', 'esos',
  'esto', 'aquel', 'aquella', 'aquellos', 'aquellas', 'aquello',

  // Negation / affirmation / misc adverbs
  'no', 'si', 'sí', 'tambien', 'también', 'tampoco', 'solo', 'sólo',
  'ya', 'muy', 'mas', 'más',

  // Relative / interrogative
  'que', 'qué', 'quien', 'quién', 'quienes', 'quiénes', 'cual', 'cuál',
  'cuales', 'cuáles', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'donde', 'dónde',
  'cuando', 'cuándo', 'cuanto', 'cuánto',

  // Common forms of ser/estar/haber (auxiliary / copular)
  'es', 'son', 'era', 'eran', 'fue', 'fueron', 'ser', 'soy', 'eres',
  'somos', 'sois', 'sea', 'sean',
  'esta', 'está', 'estan', 'están', 'estaba', 'estaban', 'estar', 'estoy',
  'estamos', 'estais', 'estáis',
  'ha', 'han', 'habia', 'había', 'habian', 'habían', 'haber', 'he', 'has',
  'hemos', 'habeis', 'habéis', 'hay',
]);
