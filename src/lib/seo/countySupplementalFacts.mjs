/**
 * County facts for the 156 counties this site publishes pages for but
 * `countySeoData.ts` does not carry.
 *
 * WHY THIS EXISTS
 *
 * 621 county slugs are published; countySeoData covers 465. The other
 * 156 render with state facts only, which is why every remaining
 * duplicate cluster in the corpus is a county page: all seven New Jersey
 * counties in the marketing family produce one body, all six Illinois
 * counties in each insurance carrier produce another. That gap accounts
 * for roughly 7,000 of the 9,651 duplicate pages left after the family
 * work, and the counties in it are not obscure — Philadelphia, Dallas,
 * Milwaukee, Franklin (Columbus), Shelby (Memphis), Suffolk, Erie.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * Population. countySeoData carries exact county populations; these
 * entries carry none, because supplying them would mean estimating and
 * an estimate presented beside exact figures reads as an exact figure.
 * The composer already omits the population sentence when it has no
 * number, so the pages simply do not make that claim.
 *
 * Also absent: a county seat. In New England much of it is nominal —
 * Connecticut abolished county government in 1960, and Massachusetts and
 * Rhode Island have dissolved or hollowed out most county functions —
 * and in Virginia the independent cities are not part of any county at
 * all. "The seat is X" is a claim that quietly misleads in those places.
 * What every entry does carry is which population centers sit in the
 * county, which is the operative fact for treatment access anyway and
 * is checkable.
 *
 * GOVERNANCE NOTES
 *
 * These are not decoration. The county composer tells readers that
 * publicly funded treatment is often administered through a county or
 * regional behavioral-health authority — advice that is actively wrong
 * in Connecticut, where there is no county government to administer
 * anything. Where the note is present, the page says so instead.
 */

const NO_COUNTY_GOVERNMENT_CT =
  "Connecticut abolished county government in 1960. The county remains a geographic and judicial region, but there is no county authority — behavioral-health services are administered by the state and through regional entities, so a county-level question here is really a state-level one.";
const LIMITED_COUNTY_GOVERNMENT_MA =
  "Massachusetts has abolished or absorbed most county governments; the county persists as a geographic and judicial region rather than a service administrator, so public behavioral-health funding is routed through the state and regional bodies.";
const LIMITED_COUNTY_GOVERNMENT_RI =
  "Rhode Island has no county government. Counties are geographic and judicial divisions only, and human services are administered at state and municipal level.";
const INDEPENDENT_CITY_VA =
  "This is one of Virginia's independent cities. It is not part of any county — the city performs the functions a county performs elsewhere, and its community services board is the body that administers publicly funded behavioral-health care.";

/**
 * @typedef {object} CountySupplement
 * @property {string} name            county (or city) name without a suffix
 * @property {string[]} majorCities   population centers within it
 * @property {string} [governance]    where county government is absent or limited
 * @property {"independent-city"} [kind]
 */

/** @type {Record<string, Record<string, CountySupplement>>} */
export const COUNTY_SUPPLEMENT = {
  arkansas: {
    washington: { name: "Washington", majorCities: ["Fayetteville", "Springdale", "Siloam Springs"] },
  },
  california: {
    "contra-costa": { name: "Contra Costa", majorCities: ["Concord", "Richmond", "Antioch", "Walnut Creek", "Martinez"] },
    ventura: { name: "Ventura", majorCities: ["Oxnard", "Thousand Oaks", "Simi Valley", "Ventura", "Camarillo"] },
  },
  colorado: {
    boulder: { name: "Boulder", majorCities: ["Boulder", "Longmont", "Louisville", "Lafayette"] },
    douglas: { name: "Douglas", majorCities: ["Castle Rock", "Parker", "Highlands Ranch", "Lone Tree"] },
    "el-paso": { name: "El Paso", majorCities: ["Colorado Springs", "Fountain", "Monument"] },
    jefferson: { name: "Jefferson", majorCities: ["Lakewood", "Arvada", "Westminster", "Golden", "Wheat Ridge"] },
  },
  connecticut: {
    fairfield: { name: "Fairfield", majorCities: ["Bridgeport", "Stamford", "Norwalk", "Danbury", "Greenwich"], governance: NO_COUNTY_GOVERNMENT_CT },
    hartford: { name: "Hartford", majorCities: ["Hartford", "New Britain", "Bristol", "West Hartford", "Manchester"], governance: NO_COUNTY_GOVERNMENT_CT },
    middlesex: { name: "Middlesex", majorCities: ["Middletown", "Old Saybrook", "Cromwell", "Portland"], governance: NO_COUNTY_GOVERNMENT_CT },
    "new-haven": { name: "New Haven", majorCities: ["New Haven", "Waterbury", "Meriden", "Milford", "West Haven"], governance: NO_COUNTY_GOVERNMENT_CT },
    "new-london": { name: "New London", majorCities: ["New London", "Norwich", "Groton", "Waterford"], governance: NO_COUNTY_GOVERNMENT_CT },
  },
  delaware: {
    kent: { name: "Kent", majorCities: ["Dover", "Smyrna", "Milford", "Camden"] },
  },
  florida: {
    lee: { name: "Lee", majorCities: ["Cape Coral", "Fort Myers", "Bonita Springs", "Estero"] },
    orange: { name: "Orange", majorCities: ["Orlando", "Winter Park", "Apopka", "Ocoee", "Winter Garden"] },
  },
  georgia: {
    cherokee: { name: "Cherokee", majorCities: ["Canton", "Woodstock", "Holly Springs"] },
    richmond: { name: "Richmond", majorCities: ["Augusta", "Hephzibah", "Blythe"] },
  },
  hawaii: {
    hawaii: { name: "Hawaii", majorCities: ["Hilo", "Kailua-Kona", "Waimea"] },
    honolulu: { name: "Honolulu", majorCities: ["Honolulu", "Pearl City", "Kaneohe", "Kailua", "Waipahu"], governance: "Honolulu is a consolidated city and county, so city and county government are the same body." },
  },
  idaho: {
    "twin-falls": { name: "Twin Falls", majorCities: ["Twin Falls", "Kimberly", "Filer", "Buhl"] },
  },
  illinois: {
    champaign: { name: "Champaign", majorCities: ["Champaign", "Urbana", "Rantoul", "Savoy"] },
    lake: { name: "Lake", majorCities: ["Waukegan", "North Chicago", "Gurnee", "Libertyville", "Highland Park"] },
    madison: { name: "Madison", majorCities: ["Alton", "Granite City", "Edwardsville", "Collinsville"] },
    mchenry: { name: "McHenry", majorCities: ["Crystal Lake", "McHenry", "Woodstock", "Algonquin"] },
    peoria: { name: "Peoria", majorCities: ["Peoria", "Peoria Heights", "Chillicothe"] },
    "st-clair": { name: "St. Clair", majorCities: ["Belleville", "East St. Louis", "O'Fallon", "Fairview Heights"] },
  },
  indiana: {
    hamilton: { name: "Hamilton", majorCities: ["Carmel", "Fishers", "Noblesville", "Westfield"] },
    lake: { name: "Lake", majorCities: ["Hammond", "Gary", "East Chicago", "Merrillville", "Crown Point"] },
    monroe: { name: "Monroe", majorCities: ["Bloomington", "Ellettsville"] },
  },
  iowa: {
    johnson: { name: "Johnson", majorCities: ["Iowa City", "Coralville", "North Liberty"] },
    polk: { name: "Polk", majorCities: ["Des Moines", "West Des Moines", "Ankeny", "Urbandale"] },
  },
  kansas: {
    douglas: { name: "Douglas", majorCities: ["Lawrence", "Eudora", "Baldwin City"] },
    johnson: { name: "Johnson", majorCities: ["Overland Park", "Olathe", "Shawnee", "Lenexa", "Leawood"] },
    leavenworth: { name: "Leavenworth", majorCities: ["Leavenworth", "Lansing", "Basehor"] },
    shawnee: { name: "Shawnee", majorCities: ["Topeka", "Rossville", "Silver Lake"] },
  },
  kentucky: {
    boone: { name: "Boone", majorCities: ["Florence", "Burlington", "Union"] },
    bullitt: { name: "Bullitt", majorCities: ["Shepherdsville", "Mount Washington", "Hillview"] },
    jefferson: { name: "Jefferson", majorCities: ["Louisville", "Jeffersontown", "St. Matthews", "Shively"], governance: "Louisville and Jefferson County merged in 2003 into a consolidated metro government." },
    madison: { name: "Madison", majorCities: ["Richmond", "Berea"] },
    warren: { name: "Warren", majorCities: ["Bowling Green", "Smiths Grove", "Oakland"] },
  },
  louisiana: {
    jefferson: { name: "Jefferson", majorCities: ["Metairie", "Kenner", "Marrero", "Gretna"], governance: "Louisiana's county-equivalent is the parish; this is Jefferson Parish." },
    lafayette: { name: "Lafayette", majorCities: ["Lafayette", "Broussard", "Youngsville", "Scott"], governance: "Louisiana's county-equivalent is the parish; Lafayette operates a consolidated city-parish government." },
  },
  maine: {
    cumberland: { name: "Cumberland", majorCities: ["Portland", "South Portland", "Westbrook", "Brunswick"] },
    york: { name: "York", majorCities: ["Biddeford", "Sanford", "Saco", "Kittery"] },
  },
  maryland: {
    frederick: { name: "Frederick", majorCities: ["Frederick", "Brunswick", "Thurmont"] },
    montgomery: { name: "Montgomery", majorCities: ["Rockville", "Gaithersburg", "Silver Spring", "Bethesda", "Germantown"] },
  },
  massachusetts: {
    bristol: { name: "Bristol", majorCities: ["New Bedford", "Fall River", "Taunton", "Attleboro"], governance: LIMITED_COUNTY_GOVERNMENT_MA },
    norfolk: { name: "Norfolk", majorCities: ["Quincy", "Brookline", "Weymouth", "Framingham", "Dedham"], governance: LIMITED_COUNTY_GOVERNMENT_MA },
    plymouth: { name: "Plymouth", majorCities: ["Brockton", "Plymouth", "Bridgewater", "Marshfield"], governance: LIMITED_COUNTY_GOVERNMENT_MA },
    worcester: { name: "Worcester", majorCities: ["Worcester", "Fitchburg", "Leominster", "Shrewsbury", "Marlborough"], governance: LIMITED_COUNTY_GOVERNMENT_MA },
  },
  michigan: {
    kent: { name: "Kent", majorCities: ["Grand Rapids", "Wyoming", "Kentwood", "Walker"] },
  },
  minnesota: {
    scott: { name: "Scott", majorCities: ["Shakopee", "Savage", "Prior Lake"] },
    "st-louis": { name: "St. Louis", majorCities: ["Duluth", "Hibbing", "Virginia", "Ely"] },
    washington: { name: "Washington", majorCities: ["Woodbury", "Cottage Grove", "Stillwater", "Oakdale"] },
  },
  mississippi: {
    harrison: { name: "Harrison", majorCities: ["Gulfport", "Biloxi", "Long Beach", "Pass Christian"] },
    jackson: { name: "Jackson", majorCities: ["Pascagoula", "Ocean Springs", "Moss Point", "Gautier"] },
    lauderdale: { name: "Lauderdale", majorCities: ["Meridian", "Marion"] },
    lee: { name: "Lee", majorCities: ["Tupelo", "Saltillo", "Verona"] },
    madison: { name: "Madison", majorCities: ["Madison", "Ridgeland", "Canton"] },
  },
  missouri: {
    boone: { name: "Boone", majorCities: ["Columbia", "Ashland", "Centralia"] },
    cass: { name: "Cass", majorCities: ["Harrisonville", "Belton", "Raymore", "Peculiar"] },
    greene: { name: "Greene", majorCities: ["Springfield", "Republic", "Nixa", "Battlefield"] },
    jackson: { name: "Jackson", majorCities: ["Kansas City", "Independence", "Blue Springs", "Lee's Summit"] },
    jefferson: { name: "Jefferson", majorCities: ["Arnold", "Festus", "Hillsboro", "De Soto"] },
    "st-charles": { name: "St. Charles", majorCities: ["St. Charles", "St. Peters", "O'Fallon", "Wentzville"] },
  },
  montana: {
    missoula: { name: "Missoula", majorCities: ["Missoula", "Lolo", "Frenchtown"] },
  },
  nebraska: {
    buffalo: { name: "Buffalo", majorCities: ["Kearney", "Gibbon", "Ravenna"] },
    douglas: { name: "Douglas", majorCities: ["Omaha", "Ralston", "Valley", "Waterloo"] },
    lancaster: { name: "Lancaster", majorCities: ["Lincoln", "Waverly", "Hickman"] },
  },
  nevada: {
    douglas: { name: "Douglas", majorCities: ["Gardnerville", "Minden", "Stateline", "Zephyr Cove"] },
    elko: { name: "Elko", majorCities: ["Elko", "Spring Creek", "Wells", "Carlin"] },
  },
  "new-hampshire": {
    hillsborough: { name: "Hillsborough", majorCities: ["Manchester", "Nashua", "Merrimack", "Milford"] },
    merrimack: { name: "Merrimack", majorCities: ["Concord", "Franklin", "Hooksett", "Bow"] },
  },
  "new-jersey": {
    camden: { name: "Camden", majorCities: ["Camden", "Cherry Hill", "Pennsauken", "Gloucester Township"] },
    essex: { name: "Essex", majorCities: ["Newark", "East Orange", "Irvington", "Bloomfield", "Montclair"] },
    middlesex: { name: "Middlesex", majorCities: ["Edison", "Woodbridge", "New Brunswick", "Perth Amboy", "Piscataway"] },
    morris: { name: "Morris", majorCities: ["Morristown", "Parsippany-Troy Hills", "Dover", "Madison"] },
    ocean: { name: "Ocean", majorCities: ["Toms River", "Lakewood", "Brick", "Jackson"] },
    passaic: { name: "Passaic", majorCities: ["Paterson", "Passaic", "Clifton", "Wayne"] },
    union: { name: "Union", majorCities: ["Elizabeth", "Union", "Plainfield", "Linden", "Westfield"] },
  },
  "new-mexico": {
    "santa-fe": { name: "Santa Fe", majorCities: ["Santa Fe", "Edgewood", "Eldorado"] },
    valencia: { name: "Valencia", majorCities: ["Los Lunas", "Belen", "Bosque Farms"] },
  },
  "new-york": {
    albany: { name: "Albany", majorCities: ["Albany", "Cohoes", "Watervliet", "Colonie"] },
    erie: { name: "Erie", majorCities: ["Buffalo", "Cheektowaga", "Tonawanda", "Amherst", "Lackawanna"] },
    "new-york-county": { name: "New York", majorCities: ["Manhattan"], governance: "New York County is coextensive with the borough of Manhattan; its services are administered by the City of New York rather than by a county government." },
    suffolk: { name: "Suffolk", majorCities: ["Brookhaven", "Islip", "Huntington", "Babylon", "Riverhead"] },
  },
  "north-carolina": {
    cumberland: { name: "Cumberland", majorCities: ["Fayetteville", "Hope Mills", "Spring Lake"] },
    durham: { name: "Durham", majorCities: ["Durham", "Rougemont"] },
  },
  "north-dakota": {
    "grand-forks": { name: "Grand Forks", majorCities: ["Grand Forks", "Larimore", "Northwood"] },
  },
  ohio: {
    butler: { name: "Butler", majorCities: ["Hamilton", "Middletown", "Fairfield", "Oxford"] },
    franklin: { name: "Franklin", majorCities: ["Columbus", "Dublin", "Westerville", "Grove City", "Gahanna"] },
    hamilton: { name: "Hamilton", majorCities: ["Cincinnati", "Norwood", "Forest Park", "Blue Ash"] },
    montgomery: { name: "Montgomery", majorCities: ["Dayton", "Kettering", "Huber Heights", "Centerville"] },
    stark: { name: "Stark", majorCities: ["Canton", "Massillon", "Alliance", "North Canton"] },
  },
  oklahoma: {
    cleveland: { name: "Cleveland", majorCities: ["Norman", "Moore", "Noble"] },
    oklahoma: { name: "Oklahoma", majorCities: ["Oklahoma City", "Edmond", "Midwest City", "Del City", "Bethany"] },
    rogers: { name: "Rogers", majorCities: ["Claremore", "Catoosa", "Owasso"] },
    tulsa: { name: "Tulsa", majorCities: ["Tulsa", "Broken Arrow", "Sand Springs", "Jenks", "Bixby"] },
  },
  oregon: {
    jackson: { name: "Jackson", majorCities: ["Medford", "Ashland", "Central Point", "Eagle Point"] },
    linn: { name: "Linn", majorCities: ["Albany", "Lebanon", "Sweet Home"] },
    marion: { name: "Marion", majorCities: ["Salem", "Keizer", "Woodburn", "Silverton"] },
    washington: { name: "Washington", majorCities: ["Hillsboro", "Beaverton", "Tigard", "Tualatin", "Forest Grove"] },
  },
  pennsylvania: {
    chester: { name: "Chester", majorCities: ["West Chester", "Coatesville", "Phoenixville", "Downingtown"] },
    delaware: { name: "Delaware", majorCities: ["Chester", "Upper Darby", "Media", "Radnor"] },
    erie: { name: "Erie", majorCities: ["Erie", "Millcreek", "Corry", "Edinboro"] },
    lancaster: { name: "Lancaster", majorCities: ["Lancaster", "Ephrata", "Lititz", "Columbia"] },
    montgomery: { name: "Montgomery", majorCities: ["Norristown", "King of Prussia", "Lansdale", "Pottstown", "Abington"] },
    philadelphia: { name: "Philadelphia", majorCities: ["Philadelphia"], governance: "Philadelphia is a consolidated city-county; city and county government are the same body." },
    york: { name: "York", majorCities: ["York", "Hanover", "Red Lion", "Dallastown"] },
  },
  "rhode-island": {
    bristol: { name: "Bristol", majorCities: ["Bristol", "Warren", "Barrington"], governance: LIMITED_COUNTY_GOVERNMENT_RI },
    kent: { name: "Kent", majorCities: ["Warwick", "Coventry", "West Warwick", "East Greenwich"], governance: LIMITED_COUNTY_GOVERNMENT_RI },
    newport: { name: "Newport", majorCities: ["Newport", "Middletown", "Portsmouth", "Tiverton"], governance: LIMITED_COUNTY_GOVERNMENT_RI },
    providence: { name: "Providence", majorCities: ["Providence", "Cranston", "Pawtucket", "Woonsocket", "East Providence"], governance: LIMITED_COUNTY_GOVERNMENT_RI },
    washington: { name: "Washington", majorCities: ["Westerly", "South Kingstown", "Narragansett", "North Kingstown"], governance: LIMITED_COUNTY_GOVERNMENT_RI },
  },
  "south-carolina": {
    anderson: { name: "Anderson", majorCities: ["Anderson", "Belton", "Williamston"] },
    charleston: { name: "Charleston", majorCities: ["Charleston", "North Charleston", "Mount Pleasant", "Summerville"] },
    greenville: { name: "Greenville", majorCities: ["Greenville", "Greer", "Simpsonville", "Mauldin", "Travelers Rest"] },
    lexington: { name: "Lexington", majorCities: ["Lexington", "West Columbia", "Cayce", "Irmo"] },
    spartanburg: { name: "Spartanburg", majorCities: ["Spartanburg", "Boiling Springs", "Duncan", "Landrum"] },
    york: { name: "York", majorCities: ["Rock Hill", "Fort Mill", "York", "Clover"] },
  },
  "south-dakota": {
    brookings: { name: "Brookings", majorCities: ["Brookings", "Volga", "Elkton"] },
    brown: { name: "Brown", majorCities: ["Aberdeen", "Groton", "Warner"] },
    lincoln: { name: "Lincoln", majorCities: ["Tea", "Harrisburg", "Canton", "Lennox"] },
  },
  tennessee: {
    hamilton: { name: "Hamilton", majorCities: ["Chattanooga", "East Ridge", "Red Bank", "Soddy-Daisy"] },
    montgomery: { name: "Montgomery", majorCities: ["Clarksville"] },
    shelby: { name: "Shelby", majorCities: ["Memphis", "Bartlett", "Collierville", "Germantown", "Millington"] },
  },
  texas: {
    dallas: { name: "Dallas", majorCities: ["Dallas", "Irving", "Garland", "Mesquite", "Richardson"] },
    denton: { name: "Denton", majorCities: ["Denton", "Lewisville", "Flower Mound", "Frisco", "Little Elm"] },
    "el-paso": { name: "El Paso", majorCities: ["El Paso", "Socorro", "Horizon City", "San Elizario"] },
    lubbock: { name: "Lubbock", majorCities: ["Lubbock", "Wolfforth", "Slaton"] },
    montgomery: { name: "Montgomery", majorCities: ["Conroe", "The Woodlands", "Magnolia", "Willis"] },
    webb: { name: "Webb", majorCities: ["Laredo", "Rio Bravo", "El Cenizo"] },
  },
  utah: {
    utah: { name: "Utah", majorCities: ["Provo", "Orem", "Lehi", "American Fork", "Spanish Fork"] },
    washington: { name: "Washington", majorCities: ["St. George", "Washington", "Hurricane", "Cedar City"] },
  },
  vermont: {
    bennington: { name: "Bennington", majorCities: ["Bennington", "Manchester", "Arlington"] },
    rutland: { name: "Rutland", majorCities: ["Rutland", "Killington", "Brandon"] },
    washington: { name: "Washington", majorCities: ["Montpelier", "Barre", "Waterbury"] },
    windham: { name: "Windham", majorCities: ["Brattleboro", "Bellows Falls", "Wilmington"] },
  },
  virginia: {
    "chesapeake-city": { name: "Chesapeake", majorCities: ["Chesapeake"], kind: "independent-city", governance: INDEPENDENT_CITY_VA },
    fairfax: { name: "Fairfax", majorCities: ["Fairfax", "Reston", "Annandale", "Springfield", "McLean"] },
    "norfolk-city": { name: "Norfolk", majorCities: ["Norfolk"], kind: "independent-city", governance: INDEPENDENT_CITY_VA },
    "richmond-city": { name: "Richmond", majorCities: ["Richmond"], kind: "independent-city", governance: INDEPENDENT_CITY_VA },
    "virginia-beach-city": { name: "Virginia Beach", majorCities: ["Virginia Beach"], kind: "independent-city", governance: INDEPENDENT_CITY_VA },
  },
  washington: {
    benton: { name: "Benton", majorCities: ["Kennewick", "Richland", "West Richland", "Prosser"] },
    clark: { name: "Clark", majorCities: ["Vancouver", "Camas", "Battle Ground", "Washougal"] },
    spokane: { name: "Spokane", majorCities: ["Spokane", "Spokane Valley", "Cheney", "Liberty Lake"] },
    yakima: { name: "Yakima", majorCities: ["Yakima", "Sunnyside", "Selah", "Toppenish"] },
  },
  "west-virginia": {
    putnam: { name: "Putnam", majorCities: ["Hurricane", "Winfield", "Nitro"] },
    raleigh: { name: "Raleigh", majorCities: ["Beckley", "Sophia", "Mabscott"] },
  },
  wisconsin: {
    brown: { name: "Brown", majorCities: ["Green Bay", "De Pere", "Ashwaubenon", "Howard"] },
    milwaukee: { name: "Milwaukee", majorCities: ["Milwaukee", "West Allis", "Wauwatosa", "Oak Creek", "Greenfield"] },
    winnebago: { name: "Winnebago", majorCities: ["Oshkosh", "Neenah", "Menasha", "Omro"] },
  },
  wyoming: {
    albany: { name: "Albany", majorCities: ["Laramie", "Rock River"] },
    fremont: { name: "Fremont", majorCities: ["Riverton", "Lander", "Dubois"] },
    laramie: { name: "Laramie", majorCities: ["Cheyenne", "Pine Bluffs", "Burns"] },
    sheridan: { name: "Sheridan", majorCities: ["Sheridan", "Ranchester", "Dayton"] },
  },
};

/** @returns {CountySupplement | null} */
export function countySupplement(stateSlug, countySlug) {
  return COUNTY_SUPPLEMENT[stateSlug]?.[countySlug] ?? null;
}

/** Total entries, for the coverage guard. */
export function supplementCount() {
  return Object.values(COUNTY_SUPPLEMENT).reduce((n, s) => n + Object.keys(s).length, 0);
}
