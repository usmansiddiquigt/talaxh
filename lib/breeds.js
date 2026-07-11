// Shared breed lists per category — used by the post-listing breed picker
// (BreedSelectScreen) and the category listing pages' breed filter.

export const BREEDS = {
  dogs: [
    'Labrador Retriever','Golden Retriever','German Shepherd','French Bulldog',
    'English Bulldog','Poodle','Beagle','Rottweiler','Yorkshire Terrier','Boxer',
    'Dachshund','Siberian Husky','Great Dane','Doberman Pinscher','Shih Tzu',
    'Border Collie','Pomeranian','Cocker Spaniel','Chihuahua','Maltese',
    'Pit Bull Terrier','Akita','Chow Chow','Dalmatian','Samoyed',
    'Bichon Frise','Whippet','Greyhound','Afghan Hound','Mixed / Other',
  ],
  cats: [
    'Persian','Siamese','Maine Coon','British Shorthair','Ragdoll','Bengal',
    'Scottish Fold','Sphynx','Abyssinian','Burmese','Russian Blue',
    'Norwegian Forest Cat','Birman','Exotic Shorthair','American Shorthair',
    'Turkish Angora','Domestic Shorthair','Mixed / Other',
  ],
  birds: [
    'African Grey Parrot','Amazon Parrot','Budgerigar (Budgie)','Canary',
    'Cockatiel','Cockatoo','Conure','Finch','Lovebird','Macaw','Parakeet',
    'Parrotlet','Quaker Parrot','Mynah','Mixed / Other',
  ],
  fish: [
    'Betta','Goldfish','Koi','Guppy','Molly','Platy','Neon Tetra','Cichlid',
    'Oscar','Discus','Angelfish','Catfish','Clownfish','Tropical Mixed','Other',
  ],
  rabbits: [
    'Holland Lop','Mini Rex','Flemish Giant','Lionhead','Dutch','New Zealand',
    'Angora','Rex','Mini Lop','Californian','English Spot','Mixed / Other',
  ],
  reptiles: [
    'Leopard Gecko','Ball Python','Bearded Dragon','Corn Snake','Crested Gecko',
    'Russian Tortoise','Sulcata Tortoise','Chameleon','Iguana','Blue-Tongued Skink',
    'King Snake','Monitor Lizard','Red-Eared Slider','Mixed / Other',
  ],
};

export const CATEGORY_LABELS = {
  dogs: 'Dog', cats: 'Cat', birds: 'Bird', fish: 'Fish',
  rabbits: 'Rabbit', reptiles: 'Reptile',
};
