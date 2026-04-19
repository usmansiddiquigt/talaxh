require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEMO_EMAIL = 'demo@talash.com';
const DEMO_PASSWORD = 'Demo1234!';

// ── Image helpers ────────────────────────────────────────────────────────────
// Dog CEO API — real breed photos, very stable
const dog = (breed, n) =>
  `https://images.dog.ceo/breeds/${breed}/n0${n}.jpg`;

// loremflickr — caches by URL, returns real Flickr photos matching the keyword
const flick = (w, h, keyword) =>
  `https://loremflickr.com/${w}/${h}/${keyword}`;

// ── Listings ─────────────────────────────────────────────────────────────────
const LISTINGS = [

  // ══════════════════════════════════════════════════════
  //  DOGS
  // ══════════════════════════════════════════════════════
  {
    title: 'Golden Retriever Puppy – KC Registered',
    category: 'dogs',
    breed: 'Golden Retriever',
    age_months: 3,
    gender: 'male',
    color: 'Golden',
    price: 800,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Stunning KC registered Golden Retriever puppy raised in a family home with children and other dogs. ' +
      'Both parents are health tested and can be seen. First vaccinations and microchip done. ' +
      'Very playful, confident, and loves cuddles. Ready to go now with a starter pack of food.',
    city: 'New York',
    location: 'New York, NY',
    is_vaccinated: true, is_microchipped: true, is_neutered: false,
    is_kc_registered: true, is_vet_checked: true,
    photos: [
      'https://images.dog.ceo/breeds/retriever-golden/n02099601_1.jpg',
      'https://images.dog.ceo/breeds/retriever-golden/n02099601_2.jpg',
      'https://images.dog.ceo/breeds/retriever-golden/n02099601_3.jpg',
    ],
    views_count: 142,
  },
  {
    title: 'French Bulldog Puppy – 8 Weeks Old',
    category: 'dogs',
    breed: 'French Bulldog',
    age_months: 2,
    gender: 'male',
    color: 'Brindle',
    price: 1500,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Adorable brindle French Bulldog puppy, DNA health-tested parents. ' +
      'Compact, affectionate, and perfect for apartment living. Vet checked, first vaccines given. ' +
      'Comes with puppy pack including food, blanket, and toy. Will not be beaten on quality.',
    city: 'Los Angeles',
    location: 'Los Angeles, CA',
    is_vaccinated: true, is_microchipped: true, is_neutered: false,
    is_kc_registered: true, is_vet_checked: true,
    photos: [
      'https://images.dog.ceo/breeds/bulldog-french/n02108915_1.jpg',
      'https://images.dog.ceo/breeds/bulldog-french/n02108915_2.jpg',
    ],
    views_count: 315,
  },
  {
    title: 'Siberian Husky – Free to Good Home',
    category: 'dogs',
    breed: 'Siberian Husky',
    age_months: 36,
    gender: 'female',
    color: 'Grey & White',
    price: null,
    is_free: true, is_adoption: false, is_swap: false,
    description:
      'Rehoming our beloved 3-year-old Husky due to relocating abroad. She is fully vaccinated, ' +
      'microchipped and spayed. Loves running, hiking, and playing in the snow. ' +
      'Needs an experienced owner with a large garden. All vet records included.',
    city: 'Chicago',
    location: 'Chicago, IL',
    is_vaccinated: true, is_microchipped: true, is_neutered: true,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      'https://images.dog.ceo/breeds/husky/n02110185_10047.jpg',
      'https://images.dog.ceo/breeds/husky/n02110185_11971.jpg',
    ],
    views_count: 445,
  },

  // ══════════════════════════════════════════════════════
  //  CATS
  // ══════════════════════════════════════════════════════
  {
    title: 'Persian Kitten – Ultra Face White',
    category: 'cats',
    breed: 'Persian',
    age_months: 3,
    gender: 'female',
    color: 'White',
    price: 650,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Beautiful ultra-face white Persian kitten raised in a loving home. ' +
      'Very gentle, loves to be held, and is already litter-trained. ' +
      'First vaccines and vet check complete. Comes with starter food pack. ' +
      'She will melt your heart from day one.',
    city: 'Miami',
    location: 'Miami, FL',
    is_vaccinated: true, is_microchipped: true, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'persian,cat,white'),
      flick(501, 400, 'persian,cat,kitten'),
    ],
    views_count: 267,
  },
  {
    title: 'Maine Coon Kitten – Gentle Giant',
    category: 'cats',
    breed: 'Maine Coon',
    age_months: 4,
    gender: 'male',
    color: 'Brown Tabby',
    price: 850,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Majestic Maine Coon kitten from health-tested parents. One of the largest and most affectionate cat breeds. ' +
      'He is confident, sociable, and great with children. ' +
      'Full vaccination course done, microchipped, and comes with a 4-week free insurance policy.',
    city: 'Seattle',
    location: 'Seattle, WA',
    is_vaccinated: true, is_microchipped: true, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'maine,coon,cat'),
      flick(502, 400, 'maine,coon,kitten'),
    ],
    views_count: 198,
  },
  {
    title: 'Rescue Tabby Cat – Adoption',
    category: 'cats',
    breed: 'Domestic Shorthair',
    age_months: 24,
    gender: 'female',
    color: 'Orange Tabby',
    price: null,
    is_free: false, is_adoption: true, is_swap: false,
    description:
      'Sweet orange tabby looking for her forever home. Fully vaccinated, spayed, and microchipped. ' +
      'She loves lap cuddles and is good with other cats. Strictly indoor only. ' +
      'Small adoption fee covers her vet costs. Home check required.',
    city: 'Portland',
    location: 'Portland, OR',
    is_vaccinated: true, is_microchipped: true, is_neutered: true,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'tabby,cat,orange'),
      flick(503, 400, 'tabby,cat'),
    ],
    views_count: 312,
  },

  // ══════════════════════════════════════════════════════
  //  BIRDS
  // ══════════════════════════════════════════════════════
  {
    title: 'African Grey Parrot – 50+ Word Vocabulary',
    category: 'birds',
    breed: 'African Grey',
    age_months: 18,
    gender: 'male',
    color: 'Grey & Red Tail',
    price: 1800,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Highly intelligent CITES-registered African Grey parrot with a growing vocabulary of over 50 words and phrases. ' +
      'He is sociable, hand-tame, and bonds strongly with his owner. ' +
      'Comes with large cage, toys, food supply, and full care guide. Vet health certificate included.',
    city: 'New York',
    location: 'New York, NY',
    is_vaccinated: true, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'african,grey,parrot'),
      flick(501, 400, 'parrot,grey,bird'),
    ],
    views_count: 189,
  },
  {
    title: 'Pair of Budgerigars – Hand Tame',
    category: 'birds',
    breed: 'Budgerigar',
    age_months: 6,
    gender: 'unknown',
    color: 'Green & Yellow',
    price: 60,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Lovely pair of hand-tame budgerigars, perfect for first-time bird owners. ' +
      'They chirp happily all day and enjoy being let out for free-flight time. ' +
      'Comes with cage and a month supply of seed mix. Easy to care for.',
    city: 'Austin',
    location: 'Austin, TX',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'budgerigar,parakeet,green'),
      flick(502, 400, 'budgie,bird,colorful'),
    ],
    views_count: 76,
  },
  {
    title: 'Cockatiel – Tame, Whistles Tunes',
    category: 'birds',
    breed: 'Cockatiel',
    age_months: 8,
    gender: 'male',
    color: 'Yellow & Grey',
    price: 120,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Charming hand-tame cockatiel who loves sitting on shoulders and whistling tunes. ' +
      'Very friendly with adults and children. ' +
      'Will come with cage, perches, and accessories. Vet checked and in perfect health.',
    city: 'Dallas',
    location: 'Dallas, TX',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'cockatiel,bird,yellow'),
      flick(503, 400, 'cockatiel,parrot'),
    ],
    views_count: 54,
  },

  // ══════════════════════════════════════════════════════
  //  RABBITS
  // ══════════════════════════════════════════════════════
  {
    title: 'Holland Lop Baby Rabbit',
    category: 'rabbits',
    breed: 'Holland Lop',
    age_months: 2,
    gender: 'female',
    color: 'Grey & White',
    price: 130,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Irresistibly cute Holland Lop bunny with signature floppy ears. Litter-trained and used to being handled. ' +
      'Vet checked and vaccinated. Ready to go now. ' +
      'Can come with a starter kit including hutch, food, and bedding for an additional $50.',
    city: 'Minneapolis',
    location: 'Minneapolis, MN',
    is_vaccinated: true, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'holland,lop,rabbit'),
      flick(501, 400, 'bunny,rabbit,cute'),
    ],
    views_count: 143,
  },
  {
    title: 'Flemish Giant Rabbit – Gentle Giant',
    category: 'rabbits',
    breed: 'Flemish Giant',
    age_months: 5,
    gender: 'male',
    color: 'Steel Grey',
    price: 180,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Massive yet gentle Flemish Giant rabbit, one of the largest rabbit breeds in the world. ' +
      'Loves being petted and is surprisingly calm indoors. ' +
      'Neutered, vaccinated, and microchipped. Great with children and other pets.',
    city: 'Denver',
    location: 'Denver, CO',
    is_vaccinated: true, is_microchipped: true, is_neutered: true,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'flemish,giant,rabbit'),
      flick(502, 400, 'rabbit,large,grey'),
    ],
    views_count: 97,
  },
  {
    title: 'Mini Rex Pair – Will Swap',
    category: 'rabbits',
    breed: 'Mini Rex',
    age_months: 5,
    gender: 'female',
    color: 'Chocolate Brown',
    price: null,
    is_free: false, is_adoption: false, is_swap: true,
    description:
      'Bonded pair of chocolate Mini Rex rabbits with incredibly soft velvety fur. ' +
      'They must go together. Open to swap for guinea pigs or hamsters. ' +
      'Both spayed. Litter-trained, friendly, and easy to handle.',
    city: 'Kansas City',
    location: 'Kansas City, MO',
    is_vaccinated: false, is_microchipped: false, is_neutered: true,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'mini,rex,rabbit,brown'),
      flick(503, 400, 'rabbit,brown,pair'),
    ],
    views_count: 88,
  },

  // ══════════════════════════════════════════════════════
  //  FISH
  // ══════════════════════════════════════════════════════
  {
    title: 'Tropical Community Fish – 25+ Fish',
    category: 'fish',
    breed: 'Tropical Mixed',
    age_months: 6,
    gender: 'unknown',
    color: 'Multicolor',
    price: 75,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Large collection of tropical community fish including neon tetras, guppies, mollies, platys, and corydoras. ' +
      'All healthy and well-established. Established 120L tank also available separately for $80. ' +
      'Perfect for someone starting a new aquarium.',
    city: 'Las Vegas',
    location: 'Las Vegas, NV',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'tropical,fish,aquarium,colorful'),
      flick(501, 400, 'fish,tank,aquarium'),
    ],
    views_count: 92,
  },
  {
    title: 'Premium Halfmoon Betta Fish',
    category: 'fish',
    breed: 'Betta – Halfmoon',
    age_months: 4,
    gender: 'male',
    color: 'Red & Blue',
    price: 35,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Show-quality halfmoon betta with stunning red and blue flowing fins. ' +
      'Very active and healthy, eating well on pellets and bloodworm. ' +
      'Currently in a 15L heated tank (not included). An eye-catching centerpiece fish.',
    city: 'San Diego',
    location: 'San Diego, CA',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'betta,fish,blue,red'),
      flick(502, 400, 'siamese,fighting,fish'),
    ],
    views_count: 67,
  },
  {
    title: 'Koi Fish – Pond Quality',
    category: 'fish',
    breed: 'Koi',
    age_months: 24,
    gender: 'unknown',
    color: 'Orange & White',
    price: 200,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Beautiful 2-year-old pond-quality koi fish, approximately 35cm in length. ' +
      'Vibrant orange and white coloration. Eating well and in excellent health. ' +
      'Great addition to any garden pond. Collection only.',
    city: 'Phoenix',
    location: 'Phoenix, AZ',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'koi,fish,pond'),
      flick(503, 400, 'koi,orange,white,water'),
    ],
    views_count: 115,
  },

  // ══════════════════════════════════════════════════════
  //  REPTILES
  // ══════════════════════════════════════════════════════
  {
    title: 'Leopard Gecko – Full Setup Included',
    category: 'reptiles',
    breed: 'Leopard Gecko',
    age_months: 14,
    gender: 'male',
    color: 'Yellow & Black',
    price: 180,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Healthy adult Leopard Gecko eating well on crickets and mealworms. ' +
      'Comes with full setup: 40-gallon terrarium, UVB lighting, thermostat, hides, and substrate. ' +
      'Vet checked 3 months ago. Perfect beginner reptile, very calm and easy to handle.',
    city: 'Detroit',
    location: 'Detroit, MI',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'leopard,gecko,reptile'),
      flick(501, 400, 'gecko,lizard,yellow'),
    ],
    views_count: 112,
  },
  {
    title: 'Bearded Dragon – Tame Juvenile',
    category: 'reptiles',
    breed: 'Bearded Dragon',
    age_months: 6,
    gender: 'male',
    color: 'Sandy Brown',
    price: 250,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Friendly juvenile Bearded Dragon, handled daily and very tame. ' +
      'Eating a healthy diet of live crickets, Dubia roaches, and mixed greens. ' +
      'Comes with large vivarium, basking lamp, UVB tube, and all accessories. ' +
      'Great personality — loves sitting on your arm.',
    city: 'Nashville',
    location: 'Nashville, TN',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'bearded,dragon,lizard'),
      flick(502, 400, 'bearded,dragon,reptile'),
    ],
    views_count: 156,
  },
  {
    title: 'Ball Python – Pastel Morph',
    category: 'reptiles',
    breed: 'Ball Python',
    age_months: 12,
    gender: 'female',
    color: 'Pastel Yellow & Brown',
    price: 320,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Beautiful pastel morph Ball Python, feeding reliably on frozen-thawed mice. ' +
      'Very docile and easy to handle — never struck or musked. ' +
      'Comes with 4-foot vivarium, thermostat, hides, and water dish. Ideal for snake beginners.',
    city: 'Houston',
    location: 'Houston, TX',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'ball,python,snake'),
      flick(503, 400, 'python,snake,pastel'),
    ],
    views_count: 203,
  },

  // ══════════════════════════════════════════════════════
  //  SMALL PETS
  // ══════════════════════════════════════════════════════
  {
    title: 'Syrian Hamster – Hand Tame',
    category: 'small-pets',
    breed: 'Syrian Hamster',
    age_months: 2,
    gender: 'female',
    color: 'Golden',
    price: 25,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Adorable golden Syrian hamster, hand-tamed from 2 weeks old and rarely bites. ' +
      'Very active and loves her wheel. Can come with large cage, wheel, and accessories for an additional $20. ' +
      'Perfect starter pet for children.',
    city: 'Charlotte',
    location: 'Charlotte, NC',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'syrian,hamster,golden'),
      flick(501, 400, 'hamster,cute,fluffy'),
    ],
    views_count: 45,
  },
  {
    title: 'Guinea Pig Pair – Boars',
    category: 'small-pets',
    breed: 'Guinea Pig',
    age_months: 3,
    gender: 'male',
    color: 'Tricolor',
    price: 50,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Two bonded male guinea pigs (boars), very vocal and entertaining. ' +
      'They love fresh vegetables and make great family pets. ' +
      'Comes with indoor cage, water bottle, hay rack, and a bag of pellets. ' +
      'They must go together as they are bonded.',
    city: 'Boston',
    location: 'Boston, MA',
    is_vaccinated: false, is_microchipped: false, is_neutered: false,
    is_kc_registered: false, is_vet_checked: false,
    photos: [
      flick(500, 400, 'guinea,pig,cute'),
      flick(502, 400, 'guinea,pig,pair'),
    ],
    views_count: 78,
  },
  {
    title: 'Ferret – Playful & Litter Trained',
    category: 'small-pets',
    breed: 'Ferret',
    age_months: 8,
    gender: 'male',
    color: 'Sable',
    price: 150,
    is_free: false, is_adoption: false, is_swap: false,
    description:
      'Mischievous and entertaining sable ferret. Litter-trained, vaccinated, and neutered. ' +
      'He loves exploring, playing with toys, and sleeping in hammocks. ' +
      'Comes with large multi-level cage, hammocks, toys, and diet food. ' +
      'Experienced ferret owner preferred.',
    city: 'San Francisco',
    location: 'San Francisco, CA',
    is_vaccinated: true, is_microchipped: true, is_neutered: true,
    is_kc_registered: false, is_vet_checked: true,
    photos: [
      flick(500, 400, 'ferret,cute,pet'),
      flick(503, 400, 'ferret,sable,animal'),
    ],
    views_count: 134,
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱  Seeding TalashApp...\n');

  // 1 ─ Create / find demo user
  let userId;
  console.log('👤  Creating demo user...');
  const { data: created, error: authErr } =
    await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });

  if (authErr) {
    const msg = authErr.message?.toLowerCase() ?? '';
    if (msg.includes('already') || authErr.status === 422) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find(u => u.email === DEMO_EMAIL);
      if (!found) { console.error('Cannot find demo user'); process.exit(1); }
      userId = found.id;
      console.log(`    ✓ Already exists  (${userId})`);
    } else {
      console.error('Auth error:', authErr.message);
      process.exit(1);
    }
  } else {
    userId = created.user.id;
    console.log(`    ✓ Created  (${userId})`);
  }

  // 2 ─ Upsert profile
  console.log('📋  Upserting profile...');
  const { error: profErr } = await supabase.from('profiles').upsert(
    { id: userId, full_name: 'Demo Seller' },
    { onConflict: 'id' }
  );
  if (profErr) console.warn('    ⚠ Profile:', profErr.message);
  else console.log('    ✓ Done');

  // 3 ─ Clear previous demo listings
  console.log('🗑   Clearing old listings...');
  await supabase.from('listings').delete().eq('seller_id', userId);
  console.log('    ✓ Cleared');

  // 4 ─ Insert
  console.log(`📦  Inserting ${LISTINGS.length} listings...`);
  const rows = LISTINGS.map(l => ({ ...l, seller_id: userId, status: 'active' }));
  const { error: insertErr } = await supabase.from('listings').insert(rows);

  if (insertErr) {
    console.error('    ✗ Insert failed:', insertErr.message);
    process.exit(1);
  }
  console.log(`    ✓ ${LISTINGS.length} listings inserted\n`);

  // ─ Summary
  const cats = [...new Set(LISTINGS.map(l => l.category))];
  console.log('✅  Done!\n');
  console.log('   Categories seeded:', cats.join(', '));
  console.log('\n   Demo login:');
  console.log(`     Email    : ${DEMO_EMAIL}`);
  console.log(`     Password : ${DEMO_PASSWORD}`);
}

seed().catch(err => { console.error(err); process.exit(1); });
