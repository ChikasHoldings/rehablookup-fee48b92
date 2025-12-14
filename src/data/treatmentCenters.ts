export interface TreatmentCenter {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  phone: string;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  description: string;
  programOverview: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  amenities: string[];
  image: string;
}

export const treatmentCenters: TreatmentCenter[] = [
  {
    id: "serenity-springs",
    name: "Serenity Springs Recovery Center",
    city: "Austin",
    state: "Texas",
    zipCode: "78701",
    address: "1234 Healing Way, Austin, TX 78701",
    phone: "(512) 555-0123",
    treatmentTypes: ["Detox", "Inpatient", "Dual Diagnosis"],
    insuranceAccepted: ["Blue Cross Blue Shield", "Aetna", "Cigna", "United Healthcare"],
    description: "A premier addiction treatment facility offering personalized care in a serene environment.",
    programOverview: "Our comprehensive 30-90 day programs combine evidence-based treatments with holistic therapies. We offer individual counseling, group therapy, family programs, and aftercare planning to ensure lasting recovery.",
    featured: true,
    rating: 4.9,
    reviewCount: 127,
    amenities: ["Private Rooms", "Yoga Studio", "Meditation Garden", "Fitness Center", "Pool"],
    image: "/placeholder.svg"
  },
  {
    id: "new-horizon",
    name: "New Horizon Treatment Center",
    city: "Denver",
    state: "Colorado",
    zipCode: "80202",
    address: "5678 Recovery Road, Denver, CO 80202",
    phone: "(303) 555-0456",
    treatmentTypes: ["Outpatient", "Inpatient", "Dual Diagnosis"],
    insuranceAccepted: ["Medicare", "Medicaid", "Humana", "Aetna"],
    description: "Compassionate care focused on rebuilding lives through evidence-based treatment.",
    programOverview: "New Horizon offers flexible treatment options including intensive outpatient programs, residential treatment, and specialized dual diagnosis care. Our team of licensed professionals creates individualized treatment plans.",
    featured: true,
    rating: 4.7,
    reviewCount: 89,
    amenities: ["Outdoor Activities", "Art Therapy Room", "Chef-Prepared Meals", "Private Counseling"],
    image: "/placeholder.svg"
  },
  {
    id: "coastal-recovery",
    name: "Coastal Recovery Institute",
    city: "San Diego",
    state: "California",
    zipCode: "92101",
    address: "910 Ocean View Blvd, San Diego, CA 92101",
    phone: "(619) 555-0789",
    treatmentTypes: ["Detox", "Inpatient", "Outpatient"],
    insuranceAccepted: ["Blue Cross Blue Shield", "Kaiser Permanente", "Cigna"],
    description: "Beachside healing with world-class addiction treatment programs.",
    programOverview: "Experience recovery in our beautiful coastal setting. Our programs include medically-supervised detox, residential treatment, and step-down outpatient services with ocean-view therapy sessions.",
    featured: false,
    rating: 4.8,
    reviewCount: 156,
    amenities: ["Ocean Views", "Beach Access", "Surfing Therapy", "Spa Services", "Private Suites"],
    image: "/placeholder.svg"
  },
  {
    id: "mountain-view",
    name: "Mountain View Wellness",
    city: "Phoenix",
    state: "Arizona",
    zipCode: "85001",
    address: "2468 Desert Bloom Lane, Phoenix, AZ 85001",
    phone: "(602) 555-0321",
    treatmentTypes: ["Detox", "Dual Diagnosis", "Outpatient"],
    insuranceAccepted: ["United Healthcare", "Aetna", "Tricare"],
    description: "Desert tranquility meets evidence-based addiction treatment.",
    programOverview: "Mountain View specializes in treating addiction alongside mental health conditions. Our desert campus provides a peaceful environment for healing with equine therapy, hiking programs, and mindfulness practices.",
    featured: true,
    rating: 4.6,
    reviewCount: 72,
    amenities: ["Equine Therapy", "Hiking Trails", "Desert Gardens", "Meditation Spaces"],
    image: "/placeholder.svg"
  },
  {
    id: "greenwood-recovery",
    name: "Greenwood Recovery Center",
    city: "Portland",
    state: "Oregon",
    zipCode: "97201",
    address: "1357 Forest Park Ave, Portland, OR 97201",
    phone: "(503) 555-0654",
    treatmentTypes: ["Inpatient", "Outpatient"],
    insuranceAccepted: ["Providence Health", "Blue Cross Blue Shield", "Medicaid"],
    description: "Nature-immersive treatment in the heart of the Pacific Northwest.",
    programOverview: "Greenwood combines traditional treatment modalities with nature-based therapies. Our forest setting and eco-therapy programs help clients reconnect with themselves and the natural world.",
    featured: false,
    rating: 4.5,
    reviewCount: 63,
    amenities: ["Forest Therapy", "Organic Gardens", "Nature Walks", "Art Studio"],
    image: "/placeholder.svg"
  },
  {
    id: "sunrise-detox",
    name: "Sunrise Detox & Recovery",
    city: "Miami",
    state: "Florida",
    zipCode: "33101",
    address: "7890 Sunrise Blvd, Miami, FL 33101",
    phone: "(305) 555-0987",
    treatmentTypes: ["Detox", "Inpatient", "Dual Diagnosis"],
    insuranceAccepted: ["Florida Blue", "Cigna", "Aetna", "Humana"],
    description: "Medical detox and comprehensive addiction treatment in sunny South Florida.",
    programOverview: "Sunrise specializes in safe, comfortable medical detoxification followed by personalized residential treatment. Our bilingual staff serves diverse communities with culturally-sensitive care.",
    featured: true,
    rating: 4.7,
    reviewCount: 94,
    amenities: ["24/7 Medical Staff", "Bilingual Services", "Pool", "Tropical Gardens"],
    image: "/placeholder.svg"
  }
];

export const treatmentTypes = ["Detox", "Inpatient", "Outpatient", "Dual Diagnosis"];

export const insuranceProviders = [
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "United Healthcare",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "Tricare",
  "Other"
];

export const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];
