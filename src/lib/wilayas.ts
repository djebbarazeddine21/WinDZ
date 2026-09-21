export interface WilayaInfo {
  code: string;
  nameFr: string;
  nameAr: string;
  feeDZD: number;
  relayFeeDZD: number;
  delay: string;
}

export const ALGERIAN_WILAYAS: WilayaInfo[] = [
  { code: '01', nameFr: 'Adrar', nameAr: 'أدرار', feeDZD: 950, relayFeeDZD: 700, delay: '48h - 72h' },
  { code: '02', nameFr: 'Chlef', nameAr: 'الشلف', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '03', nameFr: 'Laghouat', nameAr: 'الأغواط', feeDZD: 750, relayFeeDZD: 550, delay: '48h' },
  { code: '04', nameFr: 'Oum El Bouaghi', nameAr: 'أم البواقي', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '05', nameFr: 'Batna', nameAr: 'باتنة', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '06', nameFr: 'Béjaïa', nameAr: 'بجاية', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '07', nameFr: 'Biskra', nameAr: 'بسكرة', feeDZD: 700, relayFeeDZD: 500, delay: '24h - 48h' },
  { code: '08', nameFr: 'Béchar', nameAr: 'بشار', feeDZD: 950, relayFeeDZD: 700, delay: '48h - 72h' },
  { code: '09', nameFr: 'Blida', nameAr: 'البليدة', feeDZD: 500, relayFeeDZD: 350, delay: '24h' },
  { code: '10', nameFr: 'Bouira', nameAr: 'البويرة', feeDZD: 550, relayFeeDZD: 400, delay: '24h' },
  { code: '11', nameFr: 'Tamanrasset', nameAr: 'تمنراست', feeDZD: 1200, relayFeeDZD: 900, delay: '72h - 96h' },
  { code: '12', nameFr: 'Tébessa', nameAr: 'تبسة', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '13', nameFr: 'Tlemcen', nameAr: 'تلمسان', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '14', nameFr: 'Tiaret', nameAr: 'تيارت', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '15', nameFr: 'Tizi Ouzou', nameAr: 'تيزي وزو', feeDZD: 550, relayFeeDZD: 400, delay: '24h' },
  { code: '16', nameFr: 'Alger', nameAr: 'الجزائر العاصمة', feeDZD: 400, relayFeeDZD: 300, delay: '24h' },
  { code: '17', nameFr: 'Djelfa', nameAr: 'الجلفة', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '18', nameFr: 'Jijel', nameAr: 'جيجل', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '19', nameFr: 'Sétif', nameAr: 'سطيف', feeDZD: 600, relayFeeDZD: 400, delay: '24h' },
  { code: '20', nameFr: 'Saïda', nameAr: 'سعيدة', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '21', nameFr: 'Skikda', nameAr: 'سكيكدة', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '22', nameFr: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '23', nameFr: 'Annaba', nameAr: 'عنابة', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '24', nameFr: 'Guelma', nameAr: 'قالمة', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '25', nameFr: 'Constantine', nameAr: 'قسنطينة', feeDZD: 600, relayFeeDZD: 400, delay: '24h' },
  { code: '26', nameFr: 'Médéa', nameAr: 'المدية', feeDZD: 550, relayFeeDZD: 400, delay: '24h' },
  { code: '27', nameFr: 'Mostaganem', nameAr: 'مستغانم', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '28', nameFr: "M'Sila", nameAr: 'المسيلة', feeDZD: 650, relayFeeDZD: 450, delay: '48h' },
  { code: '29', nameFr: 'Mascara', nameAr: 'معسكر', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '30', nameFr: 'Ouargla', nameAr: 'ورقلة', feeDZD: 800, relayFeeDZD: 600, delay: '48h' },
  { code: '31', nameFr: 'Oran', nameAr: 'وهران', feeDZD: 550, relayFeeDZD: 400, delay: '24h' },
  { code: '32', nameFr: 'El Bayadh', nameAr: 'البيض', feeDZD: 850, relayFeeDZD: 650, delay: '48h' },
  { code: '33', nameFr: 'Illizi', nameAr: 'إيليزي', feeDZD: 1200, relayFeeDZD: 950, delay: '72h - 96h' },
  { code: '34', nameFr: 'Bordj Bou Arreridj', nameAr: 'برج بوعريريج', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '35', nameFr: 'Boumerdès', nameAr: 'بومرداس', feeDZD: 500, relayFeeDZD: 350, delay: '24h' },
  { code: '36', nameFr: 'El Tarf', nameAr: 'الطارف', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '37', nameFr: 'Tindouf', nameAr: 'تندوف', feeDZD: 1200, relayFeeDZD: 950, delay: '72h - 96h' },
  { code: '38', nameFr: 'Tissemsilt', nameAr: 'تيسمسيلت', feeDZD: 650, relayFeeDZD: 450, delay: '48h' },
  { code: '39', nameFr: 'El Oued', nameAr: 'الوادي', feeDZD: 800, relayFeeDZD: 600, delay: '48h' },
  { code: '40', nameFr: 'Khenchela', nameAr: 'خنشلة', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '41', nameFr: 'Souk Ahras', nameAr: 'سوق أهراس', feeDZD: 700, relayFeeDZD: 500, delay: '48h' },
  { code: '42', nameFr: 'Tipaza', nameAr: 'تيبازة', feeDZD: 500, relayFeeDZD: 350, delay: '24h' },
  { code: '43', nameFr: 'Mila', nameAr: 'ميلة', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '44', nameFr: 'Aïn Defla', nameAr: 'عين الدفلى', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '45', nameFr: 'Naâma', nameAr: 'النعامة', feeDZD: 850, relayFeeDZD: 650, delay: '48h' },
  { code: '46', nameFr: 'Aïn Témouchent', nameAr: 'عين تموشنت', feeDZD: 650, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '47', nameFr: 'Ghardaïa', nameAr: 'غرداية', feeDZD: 750, relayFeeDZD: 550, delay: '48h' },
  { code: '48', nameFr: 'Relizane', nameAr: 'غليزان', feeDZD: 600, relayFeeDZD: 450, delay: '24h - 48h' },
  { code: '49', nameFr: "El M'Ghair", nameAr: 'المغير', feeDZD: 800, relayFeeDZD: 600, delay: '48h' },
  { code: '50', nameFr: 'El Meniaa', nameAr: 'المنيعة', feeDZD: 850, relayFeeDZD: 650, delay: '48h' },
  { code: '51', nameFr: 'Ouled Djellal', nameAr: 'أولاد جلال', feeDZD: 750, relayFeeDZD: 550, delay: '48h' },
  { code: '52', nameFr: 'Bordj Baji Mokhtar', nameAr: 'برج باجي مختار', feeDZD: 1300, relayFeeDZD: 1000, delay: '72h - 96h' },
  { code: '53', nameFr: 'Béni Abbès', nameAr: 'بني عباس', feeDZD: 950, relayFeeDZD: 700, delay: '48h - 72h' },
  { code: '54', nameFr: 'Timimoun', nameAr: 'تيميمون', feeDZD: 950, relayFeeDZD: 700, delay: '48h - 72h' },
  { code: '55', nameFr: 'Touggourt', nameAr: 'تقرت', feeDZD: 800, relayFeeDZD: 600, delay: '48h' },
  { code: '56', nameFr: 'Djanet', nameAr: 'جانت', feeDZD: 1300, relayFeeDZD: 1000, delay: '72h - 96h' },
  { code: '57', nameFr: 'In Salah', nameAr: 'عين صالح', feeDZD: 1100, relayFeeDZD: 850, delay: '72h' },
  { code: '58', nameFr: 'In Guezzam', nameAr: 'عين قزام', feeDZD: 1300, relayFeeDZD: 1000, delay: '72h - 96h' },
];

export function getWilayaByCode(code: string): WilayaInfo | undefined {
  const padded = code.padStart(2, '0');
  return ALGERIAN_WILAYAS.find((w) => w.code === padded);
}
