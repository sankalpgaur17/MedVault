import { createPrescriptionHash } from "@/lib/contracts/contract";

export const compareHashes = (prescription1: any, prescription2: any) => {
  const hash1 = createPrescriptionHash(prescription1);
  const hash2 = createPrescriptionHash(prescription2);
  return hash1 === hash2;
};

export const normalizeText = (text: string) => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

export const isSimilarMedicine = (med1: any, med2: any) => {
  const nameSimilarity = normalizeText(med1.medicineName) === normalizeText(med2.medicineName);
  const dosageSimilarity = med1.dosage && med2.dosage ? 
    normalizeText(med1.dosage) === normalizeText(med2.dosage) : 
    !med1.dosage && !med2.dosage;
  
  return nameSimilarity && dosageSimilarity;
};
