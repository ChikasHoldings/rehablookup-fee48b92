// Complete US states and major cities for SEO pages

export interface StateData {
  name: string;
  slug: string;
  abbreviation: string;
  description: string;
  metaDescription: string;
  cities: CityData[];
}

export interface CityData {
  name: string;
  slug: string;
  population?: number;
  description: string;
  metaDescription: string;
}

export const statesData: StateData[] = [
  {
    name: "Alabama",
    slug: "alabama",
    abbreviation: "AL",
    description: "Alabama offers comprehensive addiction treatment options including detox, inpatient, and outpatient programs across the state.",
    metaDescription: "Find drug and alcohol rehab centers in Alabama. Browse verified treatment facilities offering detox, inpatient, and outpatient programs.",
    cities: [
      { name: "Birmingham", slug: "birmingham", population: 200733, description: "Birmingham is Alabama's largest city with numerous accredited treatment centers.", metaDescription: "Drug and alcohol rehab centers in Birmingham, AL. Find verified addiction treatment facilities near you." },
      { name: "Montgomery", slug: "montgomery", population: 200603, description: "Montgomery offers diverse addiction treatment options as the state capital.", metaDescription: "Find addiction treatment centers in Montgomery, AL. Browse rehab facilities offering comprehensive care." },
      { name: "Huntsville", slug: "huntsville", population: 215006, description: "Huntsville provides quality substance abuse treatment in northern Alabama.", metaDescription: "Rehab centers in Huntsville, AL. Find drug and alcohol treatment facilities with verified credentials." },
      { name: "Mobile", slug: "mobile", population: 187041, description: "Mobile offers addiction treatment services along the Gulf Coast.", metaDescription: "Drug rehab in Mobile, AL. Find addiction treatment centers and recovery programs near you." },
      { name: "Tuscaloosa", slug: "tuscaloosa", population: 99600, description: "Tuscaloosa provides accessible addiction treatment in west-central Alabama.", metaDescription: "Addiction treatment in Tuscaloosa, AL. Browse verified rehab centers and recovery programs." },
    ],
  },
  {
    name: "Alaska",
    slug: "alaska",
    abbreviation: "AK",
    description: "Alaska provides specialized addiction treatment services adapted to the unique needs of its communities.",
    metaDescription: "Find addiction treatment centers in Alaska. Browse rehab facilities offering detox, residential, and outpatient programs.",
    cities: [
      { name: "Anchorage", slug: "anchorage", population: 291247, description: "Anchorage is Alaska's largest city with the most treatment options.", metaDescription: "Drug and alcohol rehab in Anchorage, AK. Find verified addiction treatment centers." },
      { name: "Fairbanks", slug: "fairbanks", population: 32515, description: "Fairbanks offers addiction treatment services in interior Alaska.", metaDescription: "Addiction treatment in Fairbanks, AK. Find rehab centers and recovery programs." },
      { name: "Juneau", slug: "juneau", population: 32255, description: "Juneau provides treatment options as Alaska's capital city.", metaDescription: "Rehab centers in Juneau, AK. Find drug and alcohol treatment facilities." },
    ],
  },
  {
    name: "Arizona",
    slug: "arizona",
    abbreviation: "AZ",
    description: "Arizona is a leading destination for addiction treatment with world-class facilities and favorable recovery climates.",
    metaDescription: "Find top-rated rehab centers in Arizona. Browse luxury and evidence-based addiction treatment facilities across the state.",
    cities: [
      { name: "Phoenix", slug: "phoenix", population: 1608139, description: "Phoenix offers one of the largest selections of treatment centers in the Southwest.", metaDescription: "Drug and alcohol rehab in Phoenix, AZ. Find verified addiction treatment centers and recovery programs." },
      { name: "Tucson", slug: "tucson", population: 542629, description: "Tucson provides quality addiction treatment in a desert healing environment.", metaDescription: "Addiction treatment in Tucson, AZ. Browse rehab centers offering comprehensive care." },
      { name: "Mesa", slug: "mesa", population: 504258, description: "Mesa offers diverse treatment options in the Phoenix metro area.", metaDescription: "Rehab centers in Mesa, AZ. Find drug and alcohol treatment facilities near you." },
      { name: "Scottsdale", slug: "scottsdale", population: 241361, description: "Scottsdale is known for luxury addiction treatment facilities.", metaDescription: "Luxury rehab in Scottsdale, AZ. Find premier addiction treatment centers." },
      { name: "Tempe", slug: "tempe", population: 180587, description: "Tempe provides accessible treatment options in the Valley.", metaDescription: "Addiction treatment in Tempe, AZ. Browse verified rehab centers." },
    ],
  },
  {
    name: "Arkansas",
    slug: "arkansas",
    abbreviation: "AR",
    description: "Arkansas offers affordable addiction treatment options throughout the Natural State.",
    metaDescription: "Find drug and alcohol rehab centers in Arkansas. Browse verified treatment facilities offering quality care.",
    cities: [
      { name: "Little Rock", slug: "little-rock", population: 202591, description: "Little Rock has the most treatment options as Arkansas's capital.", metaDescription: "Rehab centers in Little Rock, AR. Find addiction treatment facilities near you." },
      { name: "Fort Smith", slug: "fort-smith", population: 89142, description: "Fort Smith offers treatment options in western Arkansas.", metaDescription: "Drug rehab in Fort Smith, AR. Find verified addiction treatment centers." },
      { name: "Fayetteville", slug: "fayetteville", population: 93949, description: "Fayetteville provides treatment services in northwest Arkansas.", metaDescription: "Addiction treatment in Fayetteville, AR. Browse rehab facilities." },
    ],
  },
  {
    name: "California",
    slug: "california",
    abbreviation: "CA",
    description: "California leads the nation in addiction treatment innovation with thousands of licensed facilities offering cutting-edge therapies.",
    metaDescription: "Find the best rehab centers in California. Browse luxury, holistic, and evidence-based addiction treatment programs statewide.",
    cities: [
      { name: "Los Angeles", slug: "los-angeles", population: 3898747, description: "Los Angeles offers the widest variety of treatment options in the country.", metaDescription: "Drug and alcohol rehab in Los Angeles, CA. Find verified addiction treatment centers from luxury to affordable options." },
      { name: "San Diego", slug: "san-diego", population: 1386932, description: "San Diego provides world-class treatment in a year-round recovery-friendly climate.", metaDescription: "Addiction treatment in San Diego, CA. Browse top-rated rehab centers and recovery programs." },
      { name: "San Francisco", slug: "san-francisco", population: 873965, description: "San Francisco offers innovative and progressive treatment approaches.", metaDescription: "Rehab centers in San Francisco, CA. Find drug and alcohol treatment facilities." },
      { name: "San Jose", slug: "san-jose", population: 1013240, description: "San Jose provides quality treatment options in the Bay Area.", metaDescription: "Drug rehab in San Jose, CA. Find verified addiction treatment centers near you." },
      { name: "Malibu", slug: "malibu", population: 10654, description: "Malibu is world-renowned for luxury beachfront rehab facilities.", metaDescription: "Luxury rehab in Malibu, CA. Find exclusive addiction treatment centers with oceanfront settings." },
      { name: "Orange County", slug: "orange-county", population: 3175692, description: "Orange County hosts numerous premier treatment facilities.", metaDescription: "Rehab centers in Orange County, CA. Find top-rated addiction treatment programs." },
      { name: "Sacramento", slug: "sacramento", population: 524943, description: "Sacramento offers diverse treatment options as the state capital.", metaDescription: "Addiction treatment in Sacramento, CA. Browse verified rehab facilities." },
      { name: "Fresno", slug: "fresno", population: 542107, description: "Fresno provides accessible treatment in California's Central Valley.", metaDescription: "Drug rehab in Fresno, CA. Find addiction treatment centers near you." },
      { name: "Long Beach", slug: "long-beach", population: 466742, description: "Long Beach offers quality coastal treatment options.", metaDescription: "Rehab centers in Long Beach, CA. Find drug and alcohol treatment facilities." },
      { name: "Oakland", slug: "oakland", population: 433031, description: "Oakland provides diverse treatment options in the East Bay.", metaDescription: "Addiction treatment in Oakland, CA. Browse verified rehab programs." },
    ],
  },
  {
    name: "Colorado",
    slug: "colorado",
    abbreviation: "CO",
    description: "Colorado combines mountain serenity with evidence-based addiction treatment for holistic recovery.",
    metaDescription: "Find drug and alcohol rehab centers in Colorado. Browse mountain retreat facilities and urban treatment programs.",
    cities: [
      { name: "Denver", slug: "denver", population: 715522, description: "Denver offers comprehensive treatment options as the Mile High City.", metaDescription: "Drug and alcohol rehab in Denver, CO. Find verified addiction treatment centers." },
      { name: "Colorado Springs", slug: "colorado-springs", population: 478961, description: "Colorado Springs provides treatment in a scenic mountain setting.", metaDescription: "Addiction treatment in Colorado Springs, CO. Browse rehab facilities." },
      { name: "Boulder", slug: "boulder", population: 105485, description: "Boulder is known for holistic and wellness-focused treatment.", metaDescription: "Holistic rehab in Boulder, CO. Find addiction treatment centers with wellness focus." },
      { name: "Fort Collins", slug: "fort-collins", population: 169810, description: "Fort Collins offers quality treatment in northern Colorado.", metaDescription: "Rehab centers in Fort Collins, CO. Find drug and alcohol treatment near you." },
    ],
  },
  {
    name: "Connecticut",
    slug: "connecticut",
    abbreviation: "CT",
    description: "Connecticut provides high-quality addiction treatment with strong medical infrastructure.",
    metaDescription: "Find rehab centers in Connecticut. Browse addiction treatment facilities offering comprehensive care.",
    cities: [
      { name: "Hartford", slug: "hartford", population: 121054, description: "Hartford offers diverse treatment options as the state capital.", metaDescription: "Drug rehab in Hartford, CT. Find addiction treatment centers near you." },
      { name: "New Haven", slug: "new-haven", population: 134023, description: "New Haven provides research-backed treatment approaches.", metaDescription: "Addiction treatment in New Haven, CT. Browse verified rehab facilities." },
      { name: "Bridgeport", slug: "bridgeport", population: 148654, description: "Bridgeport offers accessible treatment in southwestern Connecticut.", metaDescription: "Rehab centers in Bridgeport, CT. Find drug and alcohol treatment programs." },
      { name: "Stamford", slug: "stamford", population: 135470, description: "Stamford provides upscale treatment options near New York.", metaDescription: "Addiction treatment in Stamford, CT. Find quality rehab facilities." },
    ],
  },
  {
    name: "Delaware",
    slug: "delaware",
    abbreviation: "DE",
    description: "Delaware offers quality addiction treatment in a small state with accessible services.",
    metaDescription: "Find drug and alcohol rehab centers in Delaware. Browse verified treatment facilities statewide.",
    cities: [
      { name: "Wilmington", slug: "wilmington", population: 70898, description: "Wilmington has the most treatment options in Delaware.", metaDescription: "Rehab centers in Wilmington, DE. Find addiction treatment near you." },
      { name: "Dover", slug: "dover", population: 39403, description: "Dover offers treatment services as the state capital.", metaDescription: "Drug rehab in Dover, DE. Find verified treatment facilities." },
    ],
  },
  {
    name: "Florida",
    slug: "florida",
    abbreviation: "FL",
    description: "Florida is a top destination for addiction treatment with year-round warm weather and hundreds of licensed facilities.",
    metaDescription: "Find the best rehab centers in Florida. Browse luxury beachfront and evidence-based addiction treatment programs.",
    cities: [
      { name: "Miami", slug: "miami", population: 442241, description: "Miami offers diverse treatment options with a tropical setting.", metaDescription: "Drug and alcohol rehab in Miami, FL. Find verified addiction treatment centers." },
      { name: "Fort Lauderdale", slug: "fort-lauderdale", population: 182760, description: "Fort Lauderdale is a major hub for addiction treatment in South Florida.", metaDescription: "Addiction treatment in Fort Lauderdale, FL. Browse top-rated rehab facilities." },
      { name: "West Palm Beach", slug: "west-palm-beach", population: 117415, description: "West Palm Beach provides upscale treatment in Palm Beach County.", metaDescription: "Rehab centers in West Palm Beach, FL. Find quality addiction treatment." },
      { name: "Tampa", slug: "tampa", population: 384959, description: "Tampa offers comprehensive treatment on Florida's Gulf Coast.", metaDescription: "Drug rehab in Tampa, FL. Find verified addiction treatment programs." },
      { name: "Orlando", slug: "orlando", population: 307573, description: "Orlando provides accessible treatment in Central Florida.", metaDescription: "Addiction treatment in Orlando, FL. Browse rehab facilities near you." },
      { name: "Jacksonville", slug: "jacksonville", population: 949611, description: "Jacksonville has diverse treatment options in Northeast Florida.", metaDescription: "Rehab centers in Jacksonville, FL. Find drug and alcohol treatment." },
      { name: "Boca Raton", slug: "boca-raton", population: 97422, description: "Boca Raton is known for luxury treatment facilities.", metaDescription: "Luxury rehab in Boca Raton, FL. Find premier addiction treatment centers." },
      { name: "Delray Beach", slug: "delray-beach", population: 69451, description: "Delray Beach has become a national recovery community hub.", metaDescription: "Addiction treatment in Delray Beach, FL. Find the recovery capital of America." },
      { name: "Naples", slug: "naples", population: 19115, description: "Naples offers exclusive treatment on Florida's Paradise Coast.", metaDescription: "Rehab centers in Naples, FL. Find upscale addiction treatment." },
      { name: "Sarasota", slug: "sarasota", population: 57738, description: "Sarasota provides quality treatment with Gulf Coast access.", metaDescription: "Drug rehab in Sarasota, FL. Find verified treatment facilities." },
    ],
  },
  {
    name: "Georgia",
    slug: "georgia",
    abbreviation: "GA",
    description: "Georgia provides comprehensive addiction treatment services throughout the Peach State.",
    metaDescription: "Find drug and alcohol rehab centers in Georgia. Browse verified treatment facilities from Atlanta to Savannah.",
    cities: [
      { name: "Atlanta", slug: "atlanta", population: 498715, description: "Atlanta offers the Southeast's largest selection of treatment centers.", metaDescription: "Drug and alcohol rehab in Atlanta, GA. Find verified addiction treatment centers." },
      { name: "Savannah", slug: "savannah", population: 147780, description: "Savannah provides treatment in a historic coastal setting.", metaDescription: "Addiction treatment in Savannah, GA. Browse rehab facilities." },
      { name: "Augusta", slug: "augusta", population: 202081, description: "Augusta offers quality treatment in eastern Georgia.", metaDescription: "Rehab centers in Augusta, GA. Find drug treatment near you." },
      { name: "Marietta", slug: "marietta", population: 60972, description: "Marietta provides accessible treatment in metro Atlanta.", metaDescription: "Drug rehab in Marietta, GA. Find addiction treatment facilities." },
    ],
  },
  {
    name: "Hawaii",
    slug: "hawaii",
    abbreviation: "HI",
    description: "Hawaii offers unique island-based addiction treatment combining traditional and holistic approaches.",
    metaDescription: "Find rehab centers in Hawaii. Browse tropical addiction treatment facilities offering healing in paradise.",
    cities: [
      { name: "Honolulu", slug: "honolulu", population: 350964, description: "Honolulu has the most treatment options on Oahu.", metaDescription: "Drug and alcohol rehab in Honolulu, HI. Find addiction treatment centers." },
      { name: "Maui", slug: "maui", population: 164221, description: "Maui offers retreat-style treatment in stunning natural settings.", metaDescription: "Addiction treatment in Maui, HI. Find tropical rehab facilities." },
      { name: "Kona", slug: "kona", population: 14903, description: "Kona provides treatment on Hawaii's Big Island.", metaDescription: "Rehab centers in Kona, HI. Find drug treatment on the Big Island." },
    ],
  },
  {
    name: "Idaho",
    slug: "idaho",
    abbreviation: "ID",
    description: "Idaho provides addiction treatment in peaceful, nature-surrounded settings.",
    metaDescription: "Find drug and alcohol rehab centers in Idaho. Browse verified treatment facilities across the Gem State.",
    cities: [
      { name: "Boise", slug: "boise", population: 235684, description: "Boise offers the most treatment options in Idaho.", metaDescription: "Drug rehab in Boise, ID. Find addiction treatment centers." },
      { name: "Meridian", slug: "meridian", population: 117635, description: "Meridian provides treatment in the Boise metro area.", metaDescription: "Addiction treatment in Meridian, ID. Browse rehab facilities." },
    ],
  },
  {
    name: "Illinois",
    slug: "illinois",
    abbreviation: "IL",
    description: "Illinois offers comprehensive addiction treatment services from Chicago to the suburbs and beyond.",
    metaDescription: "Find rehab centers in Illinois. Browse addiction treatment facilities offering world-class care.",
    cities: [
      { name: "Chicago", slug: "chicago", population: 2746388, description: "Chicago provides world-class treatment options in the Midwest.", metaDescription: "Drug and alcohol rehab in Chicago, IL. Find verified addiction treatment centers." },
      { name: "Aurora", slug: "aurora", population: 180542, description: "Aurora offers accessible treatment in the Chicago suburbs.", metaDescription: "Addiction treatment in Aurora, IL. Browse rehab facilities." },
      { name: "Naperville", slug: "naperville", population: 149540, description: "Naperville provides quality treatment in the western suburbs.", metaDescription: "Rehab centers in Naperville, IL. Find drug treatment near you." },
      { name: "Springfield", slug: "springfield", population: 114394, description: "Springfield offers treatment as the state capital.", metaDescription: "Drug rehab in Springfield, IL. Find addiction treatment facilities." },
    ],
  },
  {
    name: "Indiana",
    slug: "indiana",
    abbreviation: "IN",
    description: "Indiana provides affordable and accessible addiction treatment throughout the Hoosier State.",
    metaDescription: "Find drug and alcohol rehab centers in Indiana. Browse verified treatment facilities statewide.",
    cities: [
      { name: "Indianapolis", slug: "indianapolis", population: 887642, description: "Indianapolis offers comprehensive treatment as Indiana's capital.", metaDescription: "Drug and alcohol rehab in Indianapolis, IN. Find addiction treatment centers." },
      { name: "Fort Wayne", slug: "fort-wayne", population: 263886, description: "Fort Wayne provides treatment in northeastern Indiana.", metaDescription: "Addiction treatment in Fort Wayne, IN. Browse rehab facilities." },
      { name: "Evansville", slug: "evansville", population: 117298, description: "Evansville offers treatment in southwestern Indiana.", metaDescription: "Rehab centers in Evansville, IN. Find drug treatment near you." },
    ],
  },
  {
    name: "Iowa",
    slug: "iowa",
    abbreviation: "IA",
    description: "Iowa offers quality addiction treatment in supportive Midwestern communities.",
    metaDescription: "Find rehab centers in Iowa. Browse addiction treatment facilities offering compassionate care.",
    cities: [
      { name: "Des Moines", slug: "des-moines", population: 214237, description: "Des Moines has the most treatment options in Iowa.", metaDescription: "Drug rehab in Des Moines, IA. Find addiction treatment centers." },
      { name: "Cedar Rapids", slug: "cedar-rapids", population: 137710, description: "Cedar Rapids offers treatment in eastern Iowa.", metaDescription: "Addiction treatment in Cedar Rapids, IA. Browse rehab facilities." },
    ],
  },
  {
    name: "Kansas",
    slug: "kansas",
    abbreviation: "KS",
    description: "Kansas provides accessible addiction treatment throughout the Sunflower State.",
    metaDescription: "Find drug and alcohol rehab centers in Kansas. Browse verified treatment facilities.",
    cities: [
      { name: "Wichita", slug: "wichita", population: 397532, description: "Wichita offers the most treatment options in Kansas.", metaDescription: "Drug and alcohol rehab in Wichita, KS. Find addiction treatment." },
      { name: "Kansas City", slug: "kansas-city", population: 156607, description: "Kansas City, KS provides metro-area treatment options.", metaDescription: "Addiction treatment in Kansas City, KS. Browse rehab centers." },
      { name: "Topeka", slug: "topeka", population: 126587, description: "Topeka offers treatment as the state capital.", metaDescription: "Rehab centers in Topeka, KS. Find drug treatment facilities." },
    ],
  },
  {
    name: "Kentucky",
    slug: "kentucky",
    abbreviation: "KY",
    description: "Kentucky offers specialized addiction treatment addressing the state's unique recovery needs.",
    metaDescription: "Find rehab centers in Kentucky. Browse addiction treatment facilities offering comprehensive care.",
    cities: [
      { name: "Louisville", slug: "louisville", population: 633045, description: "Louisville offers comprehensive treatment as Kentucky's largest city.", metaDescription: "Drug and alcohol rehab in Louisville, KY. Find addiction treatment centers." },
      { name: "Lexington", slug: "lexington", population: 322570, description: "Lexington provides quality treatment in the Bluegrass region.", metaDescription: "Addiction treatment in Lexington, KY. Browse rehab facilities." },
    ],
  },
  {
    name: "Louisiana",
    slug: "louisiana",
    abbreviation: "LA",
    description: "Louisiana provides addiction treatment services from New Orleans to Baton Rouge and beyond.",
    metaDescription: "Find drug and alcohol rehab centers in Louisiana. Browse verified treatment facilities.",
    cities: [
      { name: "New Orleans", slug: "new-orleans", population: 383997, description: "New Orleans offers diverse treatment options in the Crescent City.", metaDescription: "Drug and alcohol rehab in New Orleans, LA. Find addiction treatment." },
      { name: "Baton Rouge", slug: "baton-rouge", population: 227470, description: "Baton Rouge provides treatment as the state capital.", metaDescription: "Addiction treatment in Baton Rouge, LA. Browse rehab centers." },
    ],
  },
  {
    name: "Maine",
    slug: "maine",
    abbreviation: "ME",
    description: "Maine offers peaceful, nature-based addiction treatment in New England.",
    metaDescription: "Find rehab centers in Maine. Browse addiction treatment facilities in serene settings.",
    cities: [
      { name: "Portland", slug: "portland", population: 68408, description: "Portland has the most treatment options in Maine.", metaDescription: "Drug rehab in Portland, ME. Find addiction treatment centers." },
      { name: "Bangor", slug: "bangor", population: 31903, description: "Bangor offers treatment in northern Maine.", metaDescription: "Addiction treatment in Bangor, ME. Browse rehab facilities." },
    ],
  },
  {
    name: "Maryland",
    slug: "maryland",
    abbreviation: "MD",
    description: "Maryland provides high-quality addiction treatment with strong medical infrastructure.",
    metaDescription: "Find drug and alcohol rehab centers in Maryland. Browse verified treatment facilities.",
    cities: [
      { name: "Baltimore", slug: "baltimore", population: 585708, description: "Baltimore offers comprehensive treatment as Maryland's largest city.", metaDescription: "Drug and alcohol rehab in Baltimore, MD. Find addiction treatment centers." },
      { name: "Rockville", slug: "rockville", population: 68155, description: "Rockville provides upscale treatment near Washington DC.", metaDescription: "Addiction treatment in Rockville, MD. Browse rehab facilities." },
      { name: "Annapolis", slug: "annapolis", population: 40812, description: "Annapolis offers treatment as the state capital.", metaDescription: "Rehab centers in Annapolis, MD. Find drug treatment near you." },
    ],
  },
  {
    name: "Massachusetts",
    slug: "massachusetts",
    abbreviation: "MA",
    description: "Massachusetts offers world-renowned addiction treatment with cutting-edge medical research.",
    metaDescription: "Find rehab centers in Massachusetts. Browse addiction treatment facilities with innovative approaches.",
    cities: [
      { name: "Boston", slug: "boston", population: 675647, description: "Boston provides world-class treatment with premier medical institutions.", metaDescription: "Drug and alcohol rehab in Boston, MA. Find top-rated addiction treatment." },
      { name: "Worcester", slug: "worcester", population: 206518, description: "Worcester offers accessible treatment in central Massachusetts.", metaDescription: "Addiction treatment in Worcester, MA. Browse rehab facilities." },
      { name: "Springfield", slug: "springfield", population: 155929, description: "Springfield provides treatment in western Massachusetts.", metaDescription: "Rehab centers in Springfield, MA. Find drug treatment near you." },
      { name: "Cambridge", slug: "cambridge", population: 118403, description: "Cambridge offers research-backed treatment approaches.", metaDescription: "Drug rehab in Cambridge, MA. Find innovative treatment programs." },
    ],
  },
  {
    name: "Michigan",
    slug: "michigan",
    abbreviation: "MI",
    description: "Michigan provides comprehensive addiction treatment throughout the Great Lakes State.",
    metaDescription: "Find drug and alcohol rehab centers in Michigan. Browse verified treatment facilities.",
    cities: [
      { name: "Detroit", slug: "detroit", population: 639111, description: "Detroit offers diverse treatment options as Michigan's largest city.", metaDescription: "Drug and alcohol rehab in Detroit, MI. Find addiction treatment centers." },
      { name: "Grand Rapids", slug: "grand-rapids", population: 198917, description: "Grand Rapids provides quality treatment in western Michigan.", metaDescription: "Addiction treatment in Grand Rapids, MI. Browse rehab facilities." },
      { name: "Ann Arbor", slug: "ann-arbor", population: 123851, description: "Ann Arbor offers research-backed treatment approaches.", metaDescription: "Rehab centers in Ann Arbor, MI. Find drug treatment near you." },
    ],
  },
  {
    name: "Minnesota",
    slug: "minnesota",
    abbreviation: "MN",
    description: "Minnesota is the birthplace of modern addiction treatment with world-famous facilities.",
    metaDescription: "Find rehab centers in Minnesota. Browse the birthplace of the Minnesota Model treatment approach.",
    cities: [
      { name: "Minneapolis", slug: "minneapolis", population: 429954, description: "Minneapolis offers diverse treatment in the Twin Cities.", metaDescription: "Drug and alcohol rehab in Minneapolis, MN. Find addiction treatment." },
      { name: "St. Paul", slug: "st-paul", population: 311527, description: "St. Paul provides comprehensive treatment as the state capital.", metaDescription: "Addiction treatment in St. Paul, MN. Browse rehab facilities." },
      { name: "Rochester", slug: "rochester", population: 121395, description: "Rochester offers treatment near Mayo Clinic.", metaDescription: "Rehab centers in Rochester, MN. Find drug treatment near you." },
    ],
  },
  {
    name: "Mississippi",
    slug: "mississippi",
    abbreviation: "MS",
    description: "Mississippi provides accessible addiction treatment throughout the Magnolia State.",
    metaDescription: "Find drug and alcohol rehab centers in Mississippi. Browse verified treatment facilities.",
    cities: [
      { name: "Jackson", slug: "jackson", population: 153701, description: "Jackson has the most treatment options as the state capital.", metaDescription: "Drug rehab in Jackson, MS. Find addiction treatment centers." },
      { name: "Gulfport", slug: "gulfport", population: 72076, description: "Gulfport offers treatment on the Gulf Coast.", metaDescription: "Addiction treatment in Gulfport, MS. Browse rehab facilities." },
    ],
  },
  {
    name: "Missouri",
    slug: "missouri",
    abbreviation: "MO",
    description: "Missouri offers diverse addiction treatment options from Kansas City to St. Louis.",
    metaDescription: "Find rehab centers in Missouri. Browse addiction treatment facilities across the Show-Me State.",
    cities: [
      { name: "Kansas City", slug: "kansas-city", population: 508090, description: "Kansas City offers comprehensive treatment options.", metaDescription: "Drug and alcohol rehab in Kansas City, MO. Find addiction treatment." },
      { name: "St. Louis", slug: "st-louis", population: 301578, description: "St. Louis provides diverse treatment in the Gateway City.", metaDescription: "Addiction treatment in St. Louis, MO. Browse rehab facilities." },
      { name: "Springfield", slug: "springfield", population: 169176, description: "Springfield offers treatment in southwest Missouri.", metaDescription: "Rehab centers in Springfield, MO. Find drug treatment near you." },
    ],
  },
  {
    name: "Montana",
    slug: "montana",
    abbreviation: "MT",
    description: "Montana provides wilderness-based addiction treatment in Big Sky Country.",
    metaDescription: "Find drug and alcohol rehab centers in Montana. Browse nature-based treatment facilities.",
    cities: [
      { name: "Billings", slug: "billings", population: 119116, description: "Billings has the most treatment options in Montana.", metaDescription: "Drug rehab in Billings, MT. Find addiction treatment centers." },
      { name: "Missoula", slug: "missoula", population: 75516, description: "Missoula offers treatment in western Montana.", metaDescription: "Addiction treatment in Missoula, MT. Browse rehab facilities." },
    ],
  },
  {
    name: "Nebraska",
    slug: "nebraska",
    abbreviation: "NE",
    description: "Nebraska provides quality addiction treatment in supportive Midwestern communities.",
    metaDescription: "Find rehab centers in Nebraska. Browse addiction treatment facilities offering compassionate care.",
    cities: [
      { name: "Omaha", slug: "omaha", population: 486051, description: "Omaha offers comprehensive treatment as Nebraska's largest city.", metaDescription: "Drug and alcohol rehab in Omaha, NE. Find addiction treatment." },
      { name: "Lincoln", slug: "lincoln", population: 291082, description: "Lincoln provides treatment as the state capital.", metaDescription: "Addiction treatment in Lincoln, NE. Browse rehab facilities." },
    ],
  },
  {
    name: "Nevada",
    slug: "nevada",
    abbreviation: "NV",
    description: "Nevada offers diverse addiction treatment from Las Vegas to Reno and beyond.",
    metaDescription: "Find drug and alcohol rehab centers in Nevada. Browse verified treatment facilities.",
    cities: [
      { name: "Las Vegas", slug: "las-vegas", population: 641903, description: "Las Vegas provides diverse treatment options in Southern Nevada.", metaDescription: "Drug and alcohol rehab in Las Vegas, NV. Find addiction treatment centers." },
      { name: "Reno", slug: "reno", population: 264165, description: "Reno offers treatment in Northern Nevada.", metaDescription: "Addiction treatment in Reno, NV. Browse rehab facilities." },
      { name: "Henderson", slug: "henderson", population: 317610, description: "Henderson provides quality treatment near Las Vegas.", metaDescription: "Rehab centers in Henderson, NV. Find drug treatment near you." },
    ],
  },
  {
    name: "New Hampshire",
    slug: "new-hampshire",
    abbreviation: "NH",
    description: "New Hampshire provides serene New England addiction treatment settings.",
    metaDescription: "Find rehab centers in New Hampshire. Browse addiction treatment facilities in peaceful settings.",
    cities: [
      { name: "Manchester", slug: "manchester", population: 115644, description: "Manchester has the most treatment options in New Hampshire.", metaDescription: "Drug rehab in Manchester, NH. Find addiction treatment centers." },
      { name: "Nashua", slug: "nashua", population: 91322, description: "Nashua offers treatment in southern New Hampshire.", metaDescription: "Addiction treatment in Nashua, NH. Browse rehab facilities." },
    ],
  },
  {
    name: "New Jersey",
    slug: "new-jersey",
    abbreviation: "NJ",
    description: "New Jersey provides high-quality addiction treatment with easy access to major metro areas.",
    metaDescription: "Find drug and alcohol rehab centers in New Jersey. Browse verified treatment facilities.",
    cities: [
      { name: "Newark", slug: "newark", population: 311549, description: "Newark offers diverse treatment options near New York.", metaDescription: "Drug and alcohol rehab in Newark, NJ. Find addiction treatment." },
      { name: "Jersey City", slug: "jersey-city", population: 292449, description: "Jersey City provides accessible treatment across from Manhattan.", metaDescription: "Addiction treatment in Jersey City, NJ. Browse rehab facilities." },
      { name: "Princeton", slug: "princeton", population: 31822, description: "Princeton offers upscale treatment in central New Jersey.", metaDescription: "Rehab centers in Princeton, NJ. Find quality drug treatment." },
      { name: "Atlantic City", slug: "atlantic-city", population: 38574, description: "Atlantic City provides treatment on the Jersey Shore.", metaDescription: "Drug rehab in Atlantic City, NJ. Find addiction treatment centers." },
    ],
  },
  {
    name: "New Mexico",
    slug: "new-mexico",
    abbreviation: "NM",
    description: "New Mexico offers unique Southwestern addiction treatment approaches.",
    metaDescription: "Find rehab centers in New Mexico. Browse addiction treatment facilities in the Land of Enchantment.",
    cities: [
      { name: "Albuquerque", slug: "albuquerque", population: 564559, description: "Albuquerque has the most treatment options in New Mexico.", metaDescription: "Drug and alcohol rehab in Albuquerque, NM. Find addiction treatment." },
      { name: "Santa Fe", slug: "santa-fe", population: 87505, description: "Santa Fe offers holistic treatment as the state capital.", metaDescription: "Addiction treatment in Santa Fe, NM. Browse rehab facilities." },
    ],
  },
  {
    name: "New York",
    slug: "new-york",
    abbreviation: "NY",
    description: "New York offers world-class addiction treatment from Manhattan to upstate retreats.",
    metaDescription: "Find the best rehab centers in New York. Browse luxury, medical, and evidence-based treatment programs.",
    cities: [
      { name: "New York City", slug: "new-york-city", population: 8336817, description: "NYC offers the most diverse treatment options in the country.", metaDescription: "Drug and alcohol rehab in New York City. Find world-class addiction treatment." },
      { name: "Manhattan", slug: "manhattan", population: 1628706, description: "Manhattan provides upscale and convenient urban treatment.", metaDescription: "Addiction treatment in Manhattan, NY. Browse premier rehab facilities." },
      { name: "Brooklyn", slug: "brooklyn", population: 2736074, description: "Brooklyn offers diverse and accessible treatment options.", metaDescription: "Rehab centers in Brooklyn, NY. Find drug treatment near you." },
      { name: "Long Island", slug: "long-island", population: 7613632, description: "Long Island provides suburban treatment near the city.", metaDescription: "Drug rehab on Long Island, NY. Find addiction treatment centers." },
      { name: "Buffalo", slug: "buffalo", population: 278349, description: "Buffalo offers treatment in western New York.", metaDescription: "Addiction treatment in Buffalo, NY. Browse rehab facilities." },
      { name: "Rochester", slug: "rochester", population: 211328, description: "Rochester provides quality treatment in upstate New York.", metaDescription: "Rehab centers in Rochester, NY. Find drug treatment near you." },
      { name: "Albany", slug: "albany", population: 99224, description: "Albany offers treatment as the state capital.", metaDescription: "Drug rehab in Albany, NY. Find addiction treatment centers." },
    ],
  },
  {
    name: "North Carolina",
    slug: "north-carolina",
    abbreviation: "NC",
    description: "North Carolina provides diverse addiction treatment from the mountains to the coast.",
    metaDescription: "Find drug and alcohol rehab centers in North Carolina. Browse verified treatment facilities.",
    cities: [
      { name: "Charlotte", slug: "charlotte", population: 874579, description: "Charlotte offers comprehensive treatment as NC's largest city.", metaDescription: "Drug and alcohol rehab in Charlotte, NC. Find addiction treatment." },
      { name: "Raleigh", slug: "raleigh", population: 474069, description: "Raleigh provides treatment as the state capital.", metaDescription: "Addiction treatment in Raleigh, NC. Browse rehab facilities." },
      { name: "Asheville", slug: "asheville", population: 94589, description: "Asheville is known for holistic mountain retreat treatment.", metaDescription: "Holistic rehab in Asheville, NC. Find mountain treatment centers." },
      { name: "Durham", slug: "durham", population: 283506, description: "Durham offers research-backed treatment approaches.", metaDescription: "Rehab centers in Durham, NC. Find drug treatment near you." },
    ],
  },
  {
    name: "North Dakota",
    slug: "north-dakota",
    abbreviation: "ND",
    description: "North Dakota provides accessible addiction treatment in supportive communities.",
    metaDescription: "Find rehab centers in North Dakota. Browse addiction treatment facilities.",
    cities: [
      { name: "Fargo", slug: "fargo", population: 125990, description: "Fargo has the most treatment options in North Dakota.", metaDescription: "Drug rehab in Fargo, ND. Find addiction treatment centers." },
      { name: "Bismarck", slug: "bismarck", population: 74712, description: "Bismarck offers treatment as the state capital.", metaDescription: "Addiction treatment in Bismarck, ND. Browse rehab facilities." },
    ],
  },
  {
    name: "Ohio",
    slug: "ohio",
    abbreviation: "OH",
    description: "Ohio provides comprehensive addiction treatment addressing the state's unique challenges.",
    metaDescription: "Find drug and alcohol rehab centers in Ohio. Browse verified treatment facilities statewide.",
    cities: [
      { name: "Columbus", slug: "columbus", population: 905748, description: "Columbus offers diverse treatment as Ohio's capital.", metaDescription: "Drug and alcohol rehab in Columbus, OH. Find addiction treatment." },
      { name: "Cleveland", slug: "cleveland", population: 372624, description: "Cleveland provides comprehensive treatment on Lake Erie.", metaDescription: "Addiction treatment in Cleveland, OH. Browse rehab facilities." },
      { name: "Cincinnati", slug: "cincinnati", population: 309317, description: "Cincinnati offers quality treatment in southwestern Ohio.", metaDescription: "Rehab centers in Cincinnati, OH. Find drug treatment near you." },
      { name: "Dayton", slug: "dayton", population: 137644, description: "Dayton provides accessible treatment in central Ohio.", metaDescription: "Drug rehab in Dayton, OH. Find addiction treatment centers." },
    ],
  },
  {
    name: "Oklahoma",
    slug: "oklahoma",
    abbreviation: "OK",
    description: "Oklahoma offers affordable addiction treatment throughout the Sooner State.",
    metaDescription: "Find rehab centers in Oklahoma. Browse addiction treatment facilities offering quality care.",
    cities: [
      { name: "Oklahoma City", slug: "oklahoma-city", population: 681054, description: "Oklahoma City has the most treatment options in the state.", metaDescription: "Drug and alcohol rehab in Oklahoma City, OK. Find addiction treatment." },
      { name: "Tulsa", slug: "tulsa", population: 413066, description: "Tulsa offers comprehensive treatment in northeastern Oklahoma.", metaDescription: "Addiction treatment in Tulsa, OK. Browse rehab facilities." },
    ],
  },
  {
    name: "Oregon",
    slug: "oregon",
    abbreviation: "OR",
    description: "Oregon provides progressive addiction treatment with holistic and evidence-based approaches.",
    metaDescription: "Find drug and alcohol rehab centers in Oregon. Browse innovative treatment facilities.",
    cities: [
      { name: "Portland", slug: "portland", population: 652503, description: "Portland offers diverse and progressive treatment options.", metaDescription: "Drug and alcohol rehab in Portland, OR. Find addiction treatment." },
      { name: "Eugene", slug: "eugene", population: 176654, description: "Eugene provides holistic treatment in the Willamette Valley.", metaDescription: "Addiction treatment in Eugene, OR. Browse rehab facilities." },
      { name: "Bend", slug: "bend", population: 102059, description: "Bend offers outdoor-focused recovery programs.", metaDescription: "Rehab centers in Bend, OR. Find nature-based treatment." },
    ],
  },
  {
    name: "Pennsylvania",
    slug: "pennsylvania",
    abbreviation: "PA",
    description: "Pennsylvania offers extensive addiction treatment from Philadelphia to Pittsburgh.",
    metaDescription: "Find rehab centers in Pennsylvania. Browse addiction treatment facilities across the Keystone State.",
    cities: [
      { name: "Philadelphia", slug: "philadelphia", population: 1584064, description: "Philadelphia offers world-class treatment with premier medical institutions.", metaDescription: "Drug and alcohol rehab in Philadelphia, PA. Find top-rated addiction treatment." },
      { name: "Pittsburgh", slug: "pittsburgh", population: 302971, description: "Pittsburgh provides comprehensive treatment in western Pennsylvania.", metaDescription: "Addiction treatment in Pittsburgh, PA. Browse rehab facilities." },
      { name: "Harrisburg", slug: "harrisburg", population: 50099, description: "Harrisburg offers treatment as the state capital.", metaDescription: "Rehab centers in Harrisburg, PA. Find drug treatment near you." },
      { name: "Allentown", slug: "allentown", population: 126092, description: "Allentown provides treatment in the Lehigh Valley.", metaDescription: "Drug rehab in Allentown, PA. Find addiction treatment centers." },
    ],
  },
  {
    name: "Rhode Island",
    slug: "rhode-island",
    abbreviation: "RI",
    description: "Rhode Island provides quality addiction treatment in New England's smallest state.",
    metaDescription: "Find drug and alcohol rehab centers in Rhode Island. Browse verified treatment facilities.",
    cities: [
      { name: "Providence", slug: "providence", population: 190934, description: "Providence has the most treatment options in Rhode Island.", metaDescription: "Drug and alcohol rehab in Providence, RI. Find addiction treatment." },
      { name: "Newport", slug: "newport", population: 24697, description: "Newport offers upscale treatment in a coastal setting.", metaDescription: "Addiction treatment in Newport, RI. Browse rehab facilities." },
    ],
  },
  {
    name: "South Carolina",
    slug: "south-carolina",
    abbreviation: "SC",
    description: "South Carolina provides diverse addiction treatment from the coast to the upstate.",
    metaDescription: "Find rehab centers in South Carolina. Browse addiction treatment facilities statewide.",
    cities: [
      { name: "Charleston", slug: "charleston", population: 150227, description: "Charleston offers treatment in a historic coastal setting.", metaDescription: "Drug and alcohol rehab in Charleston, SC. Find addiction treatment." },
      { name: "Columbia", slug: "columbia", population: 131674, description: "Columbia provides treatment as the state capital.", metaDescription: "Addiction treatment in Columbia, SC. Browse rehab facilities." },
      { name: "Greenville", slug: "greenville", population: 72095, description: "Greenville offers treatment in the upstate region.", metaDescription: "Rehab centers in Greenville, SC. Find drug treatment near you." },
      { name: "Myrtle Beach", slug: "myrtle-beach", population: 35682, description: "Myrtle Beach provides beach-adjacent recovery programs.", metaDescription: "Drug rehab in Myrtle Beach, SC. Find coastal treatment centers." },
    ],
  },
  {
    name: "South Dakota",
    slug: "south-dakota",
    abbreviation: "SD",
    description: "South Dakota offers accessible addiction treatment in peaceful Great Plains settings.",
    metaDescription: "Find drug and alcohol rehab centers in South Dakota. Browse verified treatment facilities.",
    cities: [
      { name: "Sioux Falls", slug: "sioux-falls", population: 192517, description: "Sioux Falls has the most treatment options in South Dakota.", metaDescription: "Drug rehab in Sioux Falls, SD. Find addiction treatment centers." },
      { name: "Rapid City", slug: "rapid-city", population: 74703, description: "Rapid City offers treatment near the Black Hills.", metaDescription: "Addiction treatment in Rapid City, SD. Browse rehab facilities." },
    ],
  },
  {
    name: "Tennessee",
    slug: "tennessee",
    abbreviation: "TN",
    description: "Tennessee provides diverse addiction treatment from Nashville to Memphis and beyond.",
    metaDescription: "Find rehab centers in Tennessee. Browse addiction treatment facilities across the Volunteer State.",
    cities: [
      { name: "Nashville", slug: "nashville", population: 689447, description: "Nashville offers comprehensive treatment in Music City.", metaDescription: "Drug and alcohol rehab in Nashville, TN. Find addiction treatment." },
      { name: "Memphis", slug: "memphis", population: 633104, description: "Memphis provides diverse treatment options.", metaDescription: "Addiction treatment in Memphis, TN. Browse rehab facilities." },
      { name: "Knoxville", slug: "knoxville", population: 190740, description: "Knoxville offers treatment near the Smoky Mountains.", metaDescription: "Rehab centers in Knoxville, TN. Find drug treatment near you." },
      { name: "Chattanooga", slug: "chattanooga", population: 181099, description: "Chattanooga provides scenic mountain-adjacent treatment.", metaDescription: "Drug rehab in Chattanooga, TN. Find addiction treatment centers." },
    ],
  },
  {
    name: "Texas",
    slug: "texas",
    abbreviation: "TX",
    description: "Texas offers extensive addiction treatment options across the Lone Star State.",
    metaDescription: "Find the best rehab centers in Texas. Browse drug and alcohol treatment facilities from Houston to Dallas.",
    cities: [
      { name: "Houston", slug: "houston", population: 2304580, description: "Houston offers the widest selection of treatment in Texas.", metaDescription: "Drug and alcohol rehab in Houston, TX. Find comprehensive addiction treatment." },
      { name: "Dallas", slug: "dallas", population: 1304379, description: "Dallas provides diverse treatment options in North Texas.", metaDescription: "Addiction treatment in Dallas, TX. Browse top-rated rehab facilities." },
      { name: "San Antonio", slug: "san-antonio", population: 1434625, description: "San Antonio offers quality treatment in South Texas.", metaDescription: "Rehab centers in San Antonio, TX. Find drug treatment near you." },
      { name: "Austin", slug: "austin", population: 978908, description: "Austin provides progressive treatment as the state capital.", metaDescription: "Drug rehab in Austin, TX. Find addiction treatment centers." },
      { name: "Fort Worth", slug: "fort-worth", population: 935508, description: "Fort Worth offers comprehensive treatment in the DFW metroplex.", metaDescription: "Addiction treatment in Fort Worth, TX. Browse rehab facilities." },
      { name: "El Paso", slug: "el-paso", population: 678815, description: "El Paso provides treatment on the Texas-Mexico border.", metaDescription: "Rehab centers in El Paso, TX. Find drug treatment near you." },
    ],
  },
  {
    name: "Utah",
    slug: "utah",
    abbreviation: "UT",
    description: "Utah combines outdoor adventure therapy with evidence-based addiction treatment.",
    metaDescription: "Find drug and alcohol rehab centers in Utah. Browse wilderness therapy and evidence-based programs.",
    cities: [
      { name: "Salt Lake City", slug: "salt-lake-city", population: 199723, description: "Salt Lake City offers diverse treatment as Utah's capital.", metaDescription: "Drug and alcohol rehab in Salt Lake City, UT. Find addiction treatment." },
      { name: "Provo", slug: "provo", population: 115162, description: "Provo provides quality treatment in Utah Valley.", metaDescription: "Addiction treatment in Provo, UT. Browse rehab facilities." },
      { name: "Park City", slug: "park-city", population: 8485, description: "Park City offers luxury mountain retreat treatment.", metaDescription: "Luxury rehab in Park City, UT. Find premier treatment centers." },
    ],
  },
  {
    name: "Vermont",
    slug: "vermont",
    abbreviation: "VT",
    description: "Vermont provides peaceful, nature-based addiction treatment in New England.",
    metaDescription: "Find rehab centers in Vermont. Browse serene addiction treatment facilities.",
    cities: [
      { name: "Burlington", slug: "burlington", population: 45445, description: "Burlington has the most treatment options in Vermont.", metaDescription: "Drug rehab in Burlington, VT. Find addiction treatment centers." },
      { name: "Montpelier", slug: "montpelier", population: 8074, description: "Montpelier offers treatment as the state capital.", metaDescription: "Addiction treatment in Montpelier, VT. Browse rehab facilities." },
    ],
  },
  {
    name: "Virginia",
    slug: "virginia",
    abbreviation: "VA",
    description: "Virginia offers quality addiction treatment from the DC suburbs to the Blue Ridge.",
    metaDescription: "Find drug and alcohol rehab centers in Virginia. Browse verified treatment facilities.",
    cities: [
      { name: "Virginia Beach", slug: "virginia-beach", population: 459470, description: "Virginia Beach offers coastal treatment options.", metaDescription: "Drug and alcohol rehab in Virginia Beach, VA. Find addiction treatment." },
      { name: "Richmond", slug: "richmond", population: 226610, description: "Richmond provides treatment as the state capital.", metaDescription: "Addiction treatment in Richmond, VA. Browse rehab facilities." },
      { name: "Norfolk", slug: "norfolk", population: 244703, description: "Norfolk offers treatment in Hampton Roads.", metaDescription: "Rehab centers in Norfolk, VA. Find drug treatment near you." },
      { name: "Arlington", slug: "arlington", population: 238643, description: "Arlington provides upscale treatment near Washington DC.", metaDescription: "Drug rehab in Arlington, VA. Find addiction treatment centers." },
    ],
  },
  {
    name: "Washington",
    slug: "washington",
    abbreviation: "WA",
    description: "Washington provides progressive addiction treatment in the Pacific Northwest.",
    metaDescription: "Find rehab centers in Washington State. Browse innovative addiction treatment facilities.",
    cities: [
      { name: "Seattle", slug: "seattle", population: 737015, description: "Seattle offers diverse and progressive treatment options.", metaDescription: "Drug and alcohol rehab in Seattle, WA. Find addiction treatment." },
      { name: "Spokane", slug: "spokane", population: 228989, description: "Spokane provides treatment in eastern Washington.", metaDescription: "Addiction treatment in Spokane, WA. Browse rehab facilities." },
      { name: "Tacoma", slug: "tacoma", population: 219346, description: "Tacoma offers accessible treatment near Seattle.", metaDescription: "Rehab centers in Tacoma, WA. Find drug treatment near you." },
      { name: "Bellevue", slug: "bellevue", population: 151854, description: "Bellevue provides upscale treatment in the Eastside.", metaDescription: "Drug rehab in Bellevue, WA. Find quality treatment centers." },
    ],
  },
  {
    name: "West Virginia",
    slug: "west-virginia",
    abbreviation: "WV",
    description: "West Virginia offers specialized addiction treatment addressing the state's unique recovery needs.",
    metaDescription: "Find drug and alcohol rehab centers in West Virginia. Browse verified treatment facilities.",
    cities: [
      { name: "Charleston", slug: "charleston", population: 48864, description: "Charleston has the most treatment options as the state capital.", metaDescription: "Drug and alcohol rehab in Charleston, WV. Find addiction treatment." },
      { name: "Huntington", slug: "huntington", population: 46842, description: "Huntington provides treatment in the Tri-State area.", metaDescription: "Addiction treatment in Huntington, WV. Browse rehab facilities." },
    ],
  },
  {
    name: "Wisconsin",
    slug: "wisconsin",
    abbreviation: "WI",
    description: "Wisconsin provides quality addiction treatment in supportive Midwestern communities.",
    metaDescription: "Find rehab centers in Wisconsin. Browse addiction treatment facilities across the Badger State.",
    cities: [
      { name: "Milwaukee", slug: "milwaukee", population: 577222, description: "Milwaukee offers comprehensive treatment as Wisconsin's largest city.", metaDescription: "Drug and alcohol rehab in Milwaukee, WI. Find addiction treatment." },
      { name: "Madison", slug: "madison", population: 269840, description: "Madison provides research-backed treatment as the state capital.", metaDescription: "Addiction treatment in Madison, WI. Browse rehab facilities." },
      { name: "Green Bay", slug: "green-bay", population: 107395, description: "Green Bay offers accessible treatment in northeastern Wisconsin.", metaDescription: "Rehab centers in Green Bay, WI. Find drug treatment near you." },
    ],
  },
  {
    name: "Wyoming",
    slug: "wyoming",
    abbreviation: "WY",
    description: "Wyoming offers wilderness-based addiction treatment in America's least populated state.",
    metaDescription: "Find drug and alcohol rehab centers in Wyoming. Browse nature-based treatment facilities.",
    cities: [
      { name: "Cheyenne", slug: "cheyenne", population: 65132, description: "Cheyenne has the most treatment options as the state capital.", metaDescription: "Drug rehab in Cheyenne, WY. Find addiction treatment centers." },
      { name: "Casper", slug: "casper", population: 58610, description: "Casper offers treatment in central Wyoming.", metaDescription: "Addiction treatment in Casper, WY. Browse rehab facilities." },
    ],
  },
];

// Helper functions
export const getStateBySlug = (slug: string): StateData | undefined => {
  return statesData.find(state => state.slug === slug);
};

export const getCityBySlug = (stateSlug: string, citySlug: string): CityData | undefined => {
  const state = getStateBySlug(stateSlug);
  return state?.cities.find(city => city.slug === citySlug);
};

export const getAllStateSlugs = (): string[] => {
  return statesData.map(state => state.slug);
};

export const getAllCitySlugs = (): { stateSlug: string; citySlug: string }[] => {
  const slugs: { stateSlug: string; citySlug: string }[] = [];
  statesData.forEach(state => {
    state.cities.forEach(city => {
      slugs.push({ stateSlug: state.slug, citySlug: city.slug });
    });
  });
  return slugs;
};

// Get nearby states for internal linking
export const getNearbyStates = (stateSlug: string, limit: number = 4): StateData[] => {
  const stateIndex = statesData.findIndex(s => s.slug === stateSlug);
  if (stateIndex === -1) return [];
  
  const nearby: StateData[] = [];
  for (let i = 1; nearby.length < limit; i++) {
    if (stateIndex - i >= 0) nearby.push(statesData[stateIndex - i]);
    if (nearby.length >= limit) break;
    if (stateIndex + i < statesData.length) nearby.push(statesData[stateIndex + i]);
  }
  return nearby.slice(0, limit);
};

// Get top cities across all states (for sitemap/homepage)
export const getTopCities = (limit: number = 50): (CityData & { state: StateData })[] => {
  const allCities: (CityData & { state: StateData })[] = [];
  statesData.forEach(state => {
    state.cities.forEach(city => {
      allCities.push({ ...city, state });
    });
  });
  return allCities
    .sort((a, b) => (b.population || 0) - (a.population || 0))
    .slice(0, limit);
};
