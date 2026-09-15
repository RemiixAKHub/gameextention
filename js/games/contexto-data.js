// contexto-data.js — Static offline word clusters for Contexto (Phase 6: full 200-cluster dataset)
// No network calls, no embeddings — closeness is simulated via curated rankedWords order.
// target MUST always equal rankedWords[0]. All words lowercase. No duplicate targets.
// Clusters 1-20: Phase 1 starter set. Clusters 21-100: Phase 2 expansion. Clusters 101-200: Phase 6 expansion.

const CONTEXTO_CLUSTERS = [
  {
    target: "ocean",
    category: "Nature",
    hints: [
      "It covers most of Earth's surface.",
      "It is full of salt water.",
      "Many creatures live beneath its surface."
    ],
    rankedWords: ["ocean","sea","water","wave","beach","shore","tide","current","coral","reef","fish","boat","sand","salt","deep","blue","ship","whale","dolphin","storm","coast","horizon"]
  },
  {
    target: "mountain",
    category: "Geography",
    hints: [
      "It rises high above the land.",
      "Climbers try to reach its top.",
      "Snow often covers its peak."
    ],
    rankedWords: ["mountain","peak","summit","cliff","valley","rock","snow","hill","ridge","climb","altitude","glacier","cave","trail","slope","boulder","avalanche","range","base","camp","hiker","elevation"]
  },
  {
    target: "lion",
    category: "Animals",
    hints: [
      "It is known as the king of the jungle.",
      "Males have a large mane.",
      "It lives in groups called prides."
    ],
    rankedWords: ["lion","tiger","mane","roar","pride","savanna","cub","predator","hunt","claw","jungle","king","cat","wild","africa","prey","den","fur","paw","zebra","gazelle","safari"]
  },
  {
    target: "eagle",
    category: "Animals",
    hints: [
      "It is a bird of prey.",
      "It has sharp talons.",
      "It often symbolizes freedom."
    ],
    rankedWords: ["eagle","hawk","feather","wing","talon","nest","fly","sky","beak","prey","soar","bird","falcon","raptor","cliff","hunt","wildlife","forest","freedom","symbol","flight","plume"]
  },
  {
    target: "pizza",
    category: "Food",
    hints: [
      "It is often round and sliced into triangles.",
      "It usually has cheese and toppings.",
      "It originated in Italy."
    ],
    rankedWords: ["pizza","cheese","crust","topping","pepperoni","tomato","sauce","oven","slice","dough","italian","bake","mozzarella","restaurant","delivery","olive","basil","garlic","box","pie","kitchen","pepper"]
  },
  {
    target: "chocolate",
    category: "Food",
    hints: [
      "It is made from cocoa beans.",
      "It can be dark or milk.",
      "It is a popular sweet treat."
    ],
    rankedWords: ["chocolate","cocoa","candy","sweet","bar","sugar","dessert","brown","milk","dark","truffle","cake","cookie","melt","bitter","treat","wrapper","fudge","bean","snack","praline","confection"]
  },
  {
    target: "airport",
    category: "Travel",
    hints: [
      "It is where planes take off and land.",
      "Passengers wait at gates.",
      "You go through security here."
    ],
    rankedWords: ["airport","plane","flight","runway","terminal","gate","luggage","ticket","pilot","passenger","security","boarding","airline","departure","arrival","baggage","customs","tower","jet","travel","checkin","lounge"]
  },
  {
    target: "train",
    category: "Transport",
    hints: [
      "It runs on tracks.",
      "It stops at stations.",
      "It can carry many passengers at once."
    ],
    rankedWords: ["train","railway","track","station","locomotive","carriage","ticket","platform","conductor","subway","tunnel","engine","rail","freight","passenger","whistle","journey","commute","wheel","depot","express","schedule"]
  },
  {
    target: "computer",
    category: "Technology",
    hints: [
      "It processes data using a keyboard and mouse.",
      "It runs software programs.",
      "It connects to the internet."
    ],
    rankedWords: ["computer","keyboard","monitor","screen","mouse","software","processor","laptop","internet","program","code","memory","hardware","data","chip","desktop","server","network","file","browser","storage","cursor"]
  },
  {
    target: "robot",
    category: "Technology",
    hints: [
      "It can be programmed to perform tasks.",
      "It often has mechanical parts.",
      "Some can think using artificial intelligence."
    ],
    rankedWords: ["robot","machine","ai","automation","sensor","gear","circuit","motor","android","factory","program","arm","metal","artificial","intelligence","drone","wire","battery","control","function","mechanical","futuristic"]
  },
  {
    target: "gravity",
    category: "Science",
    hints: [
      "It pulls objects toward the earth.",
      "Newton described laws about it.",
      "It keeps planets in orbit."
    ],
    rankedWords: ["gravity","force","mass","weight","planet","physics","newton","fall","orbit","pull","earth","attraction","space","motion","acceleration","universe","matter","energy","moon","tide","apple","science"]
  },
  {
    target: "volcano",
    category: "Science",
    hints: [
      "It can erupt with molten rock.",
      "It often forms a cone-shaped mountain.",
      "Lava flows from its crater."
    ],
    rankedWords: ["volcano","lava","eruption","magma","ash","crater","mountain","fire","smoke","rock","molten","earthquake","island","heat","explosion","tectonic","cone","sulfur","disaster","plate","steam","geology"]
  },
  {
    target: "soccer",
    category: "Sports",
    hints: [
      "It is played with a round ball and feet.",
      "Two teams try to score goals.",
      "It is called football outside the US."
    ],
    rankedWords: ["soccer","football","goal","ball","field","player","kick","referee","team","match","striker","midfielder","stadium","coach","league","penalty","cleats","pitch","tournament","score","whistle","jersey"]
  },
  {
    target: "basketball",
    category: "Sports",
    hints: [
      "Players dribble a ball and shoot hoops.",
      "It is played on a court.",
      "A team scores by shooting into a basket."
    ],
    rankedWords: ["basketball","hoop","court","dribble","ball","player","dunk","jersey","coach","team","shot","rebound","referee","arena","league","sneakers","guard","forward","score","timeout","buzzer","championship"]
  },
  {
    target: "galaxy",
    category: "Space",
    hints: [
      "It contains billions of stars.",
      "Our solar system belongs to one.",
      "It can be spiral or elliptical."
    ],
    rankedWords: ["galaxy","star","universe","planet","orbit","cosmos","nebula","telescope","milky","astronomer","space","comet","moon","sun","cluster","blackhole","spiral","asteroid","satellite","gravity","cosmic","void"]
  },
  {
    target: "guitar",
    category: "Music",
    hints: [
      "It has strings you strum or pick.",
      "It can be acoustic or electric.",
      "Musicians play it in bands."
    ],
    rankedWords: ["guitar","string","chord","strum","fret","acoustic","electric","pick","amplifier","band","melody","song","musician","note","tune","rock","concert","bass","riff","tuning","wood","sound"]
  },
  {
    target: "concert",
    category: "Music",
    hints: [
      "It is a live performance of music.",
      "Fans gather to watch the performers.",
      "It often happens on a stage with lights."
    ],
    rankedWords: ["concert","stage","band","audience","crowd","music","performance","ticket","venue","singer","speaker","encore","tour","festival","microphone","spotlight","fans","setlist","arena","show","lights","backstage"]
  },
  {
    target: "movie",
    category: "Movies",
    hints: [
      "It is watched on a big screen.",
      "Actors perform in it.",
      "You often eat popcorn while watching it."
    ],
    rankedWords: ["movie","film","cinema","actor","director","screen","theater","script","scene","camera","popcorn","plot","sequel","trailer","hollywood","premiere","character","genre","boxoffice","credits","soundtrack","ticket"]
  },
  {
    target: "kitchen",
    category: "Household",
    hints: [
      "It is a room where meals are cooked.",
      "It usually has a stove and fridge.",
      "You find pots and pans here."
    ],
    rankedWords: ["kitchen","stove","oven","sink","fridge","counter","pan","pot","knife","cabinet","dish","cook","recipe","spoon","plate","blender","microwave","apron","chef","food","spice","table"]
  },
  {
    target: "pyramid",
    category: "History",
    hints: [
      "It is an ancient structure found in Egypt.",
      "Pharaohs were buried inside similar structures.",
      "It has a triangular shape made of stone."
    ],
    rankedWords: ["pyramid","egypt","pharaoh","tomb","sphinx","desert","ancient","stone","mummy","nile","hieroglyph","treasure","archaeologist","sand","ruins","temple","dynasty","civilization","sarcophagus","artifact","monument","excavation"]
  },
  {
    target: "forest",
    category: "Nature",
    hints: ["It is filled with many trees.", "Animals live among its plants.", "Sunlight filters through the leaves."],
    rankedWords: ["forest","tree","woods","leaves","branch","wildlife","trail","moss","fern","canopy","hiking","wood","jungle","log","squirrel","deer","shade","root","grove","nature","camp","owl","bark","undergrowth"]
  },
  {
    target: "river",
    category: "Nature",
    hints: ["It flows from source to sea.", "Fish swim in its current.", "It winds through valleys and plains."],
    rankedWords: ["river","stream","water","current","bank","flow","bridge","fish","rapids","delta","tributary","canoe","flood","dam","creek","waterway","mouth","source","fishing","boat","valley","mud","reed"]
  },
  {
    target: "desert",
    category: "Nature",
    hints: ["It receives very little rainfall.", "Sand often covers its surface.", "Camels can survive here."],
    rankedWords: ["desert","sand","dune","cactus","oasis","heat","camel","drought","arid","dry","mirage","sun","dust","wasteland","scorpion","sahara","canyon","rock","tumbleweed","trek","thirst","wind","barren"]
  },
  {
    target: "rainbow",
    category: "Nature",
    hints: ["It appears after rain.", "It has seven colors.", "It forms an arc in the sky."],
    rankedWords: ["rainbow","colors","arc","sky","prism","rain","sunlight","spectrum","red","violet","refraction","cloud","light","weather","storm","droplet","bow","vibrant","sunshine","myth","gold","arch"]
  },
  {
    target: "waterfall",
    category: "Nature",
    hints: ["Water falls from a high point.", "It creates a loud roaring sound.", "It is often found along rivers."],
    rankedWords: ["waterfall","cascade","cliff","river","mist","plunge","rocks","stream","spray","gorge","rapids","height","roar","pool","canyon","nature","hike","current","drop","basin","tourist","forest"]
  },
  {
    target: "glacier",
    category: "Nature",
    hints: ["It is a massive body of ice.", "It moves very slowly over land.", "It can be found near the poles."],
    rankedWords: ["glacier","ice","snow","arctic","cold","iceberg","frozen","polar","crevasse","melt","mountain","glacial","antarctica","frost","avalanche","climate","blue","slow","valley","cave","expedition","chill"]
  },
  {
    target: "elephant",
    category: "Animals",
    hints: ["It is the largest land animal.", "It has a long trunk.", "It lives in herds in Africa or Asia."],
    rankedWords: ["elephant","trunk","tusk","herd","africa","ivory","mammal","gray","safari","savanna","ear","zoo","giant","wrinkle","jungle","asia","calf","matriarch","stomp","wildlife","poacher","water"]
  },
  {
    target: "dolphin",
    category: "Animals",
    hints: ["It is a highly intelligent sea mammal.", "It communicates with clicks and whistles.", "It often leaps out of the water."],
    rankedWords: ["dolphin","porpoise","whale","marine","ocean","sea","mammal","fin","flipper","pod","swim","water","splash","blowhole","tail","intelligent","echo","click","aquarium","jump","playful","fish","trainer","blue"]
  },
  {
    target: "wolf",
    category: "Animals",
    hints: ["It hunts in packs.", "It is closely related to dogs.", "It howls at night."],
    rankedWords: ["wolf","pack","howl","fang","forest","predator","hunt","fur","wild","moon","den","alpha","canine","prey","snow","night","growl","wilderness","pup","territory","claw","tundra"]
  },
  {
    target: "penguin",
    category: "Animals",
    hints: ["It is a flightless bird.", "It lives in cold climates.", "It waddles on ice."],
    rankedWords: ["penguin","ice","waddle","swim","fish","antarctica","flightless","cold","egg","colony","snow","feather","chick","arctic","black","white","tuxedo","zoo","glacier","huddle","ocean","wing"]
  },
  {
    target: "butterfly",
    category: "Animals",
    hints: ["It starts life as a caterpillar.", "It has colorful wings.", "It drinks nectar from flowers."],
    rankedWords: ["butterfly","wing","caterpillar","cocoon","flower","nectar","metamorphosis","insect","garden","flutter","colorful","pollen","chrysalis","spring","meadow","migration","moth","delicate","petals","monarch","flight","bug"]
  },
  {
    target: "shark",
    category: "Animals",
    hints: ["It is a predator found in the ocean.", "It has rows of sharp teeth.", "Its fin sticks above the water."],
    rankedWords: ["shark","fish","ocean","fin","teeth","predator","sea","jaws","bite","gill","water","attack","reef","hunter","great","blue","danger","deep","tank","aquarium","fear","swim"]
  },
  {
    target: "burger",
    category: "Food",
    hints: ["It is served between two buns.", "It usually has a meat patty.", "It is a popular fast food."],
    rankedWords: ["burger","bun","patty","cheese","fries","ketchup","lettuce","tomato","grill","meat","fastfood","mustard","pickle","beef","diner","sandwich","onion","bacon","sauce","meal","drivethrough","napkin"]
  },
  {
    target: "sushi",
    category: "Food",
    hints: ["It is a Japanese dish.", "It often includes raw fish.", "It is wrapped in seaweed and rice."],
    rankedWords: ["sushi","rice","fish","seaweed","roll","wasabi","chopsticks","soy","japan","raw","salmon","tuna","nori","ginger","restaurant","plate","sashimi","tray","chef","delicate","tea","platter"]
  },
  {
    target: "coffee",
    category: "Food",
    hints: ["It is brewed from roasted beans.", "It is often drunk in the morning.", "It contains caffeine."],
    rankedWords: ["coffee","bean","cup","caffeine","brew","espresso","mug","cafe","roast","milk","sugar","morning","aroma","latte","barista","grind","drink","warm","black","filter","steam","wake"]
  },
  {
    target: "bread",
    category: "Food",
    hints: ["It is baked from flour and water.", "It is often sliced for sandwiches.", "It rises with yeast."],
    rankedWords: ["bread","flour","dough","bake","yeast","loaf","oven","slice","crust","toast","wheat","sandwich","crumb","bakery","warm","butter","grain","rise","knead","soft","sourdough","crumbs"]
  },
  {
    target: "cheese",
    category: "Food",
    hints: ["It is made from milk.", "It can be soft or hard.", "It is often melted on food."],
    rankedWords: ["cheese","milk","dairy","cheddar","slice","melt","wheel","cow","mozzarella","cream","aged","curd","block","sandwich","cracker","yellow","wedge","mold","parmesan","spread","factory","farm"]
  },
  {
    target: "icecream",
    category: "Food",
    hints: ["It is a frozen sweet dessert.", "It is often served in a cone.", "It melts quickly in the sun."],
    rankedWords: ["icecream","cone","scoop","dessert","vanilla","chocolate","sundae","frozen","cold","sprinkles","sweet","cream","cup","spoon","melt","flavor","parlor","summer","treat","waffle","syrup","bowl"]
  },
  {
    target: "hotel",
    category: "Travel",
    hints: ["It offers rooms for travelers.", "It often has a front desk and lobby.", "Guests check in and check out."],
    rankedWords: ["hotel","room","lobby","checkin","guest","reservation","suite","bed","receptionist","luggage","resort","vacation","staff","keycard","service","minibar","pool","concierge","travel","booking","elevator","towel"]
  },
  {
    target: "passport",
    category: "Travel",
    hints: ["It proves your identity when traveling abroad.", "It gets stamped at borders.", "You need it to board international flights."],
    rankedWords: ["passport","visa","border","customs","travel","stamp","identity","document","airport","country","citizenship","photo","immigration","journey","foreign","luggage","ticket","security","embassy","nationality","abroad","entry"]
  },
  {
    target: "beach",
    category: "Travel",
    hints: ["It is a sandy area next to the sea.", "People sunbathe and swim here.", "Waves crash onto its shore."],
    rankedWords: ["beach","sand","sea","wave","sun","shore","towel","umbrella","swim","surf","shell","ocean","vacation","tan","coast","bikini","tide","palm","seagull","boardwalk","holiday","relax"]
  },
  {
    target: "backpack",
    category: "Travel",
    hints: ["It is worn on the back to carry items.", "Hikers and students often use one.", "It has straps and compartments."],
    rankedWords: ["backpack","strap","bag","hiking","pocket","zipper","travel","school","camp","gear","carry","luggage","trail","pack","student","outdoor","load","journey","buckle","adventure","storage","weight"]
  },
  {
    target: "cruise",
    category: "Travel",
    hints: ["It is a vacation aboard a large ship.", "It stops at multiple ports.", "Passengers enjoy pools and buffets onboard."],
    rankedWords: ["cruise","ship","ocean","deck","cabin","voyage","port","vacation","buffet","captain","passenger","sail","liner","sea","itinerary","excursion","lounge","anchor","horizon","luxury","dock","wave"]
  },
  {
    target: "smartphone",
    category: "Technology",
    hints: ["It fits in your pocket.", "It connects to the internet and makes calls.", "It runs apps."],
    rankedWords: ["smartphone","phone","app","screen","touchscreen","battery","camera","call","text","internet","charger","wifi","notification","contact","android","ios","mobile","case","signal","download","keyboard","pocket"]
  },
  {
    target: "internet",
    category: "Technology",
    hints: ["It connects computers worldwide.", "You use it to browse websites.", "It requires a network connection."],
    rankedWords: ["internet","web","browser","network","website","wifi","online","connection","router","server","email","search","data","link","url","download","upload","bandwidth","cloud","streaming","social","digital"]
  },
  {
    target: "software",
    category: "Technology",
    hints: ["It is a set of instructions run by a computer.", "It can be installed or updated.", "It differs from physical hardware."],
    rankedWords: ["software","program","code","app","developer","update","install","bug","license","computer","application","algorithm","interface","download","patch","version","system","tool","engineer","script","platform","debug"]
  },
  {
    target: "camera",
    category: "Technology",
    hints: ["It captures photos and videos.", "It has a lens to focus light.", "Photographers use it to take pictures."],
    rankedWords: ["camera","lens","photo","picture","shutter","flash","zoom","film","digital","photographer","video","tripod","focus","image","snapshot","aperture","memory","screen","click","gallery","capture","exposure"]
  },
  {
    target: "battery",
    category: "Technology",
    hints: ["It stores electrical energy.", "It powers devices when unplugged.", "It needs to be recharged or replaced."],
    rankedWords: ["battery","charge","power","energy","electric","cell","voltage","recharge","plug","device","lithium","drain","socket","current","portable","charger","backup","watt","circuit","powerbank","dead","spark"]
  },
  {
    target: "atom",
    category: "Science",
    hints: ["It is the basic unit of matter.", "It contains protons, neutrons, and electrons.", "Everything is made of it."],
    rankedWords: ["atom","proton","neutron","electron","nucleus","element","molecule","particle","matter","chemistry","physics","energy","bond","orbit","mass","charge","isotope","periodic","structure","subatomic","science","reaction"]
  },
  {
    target: "dna",
    category: "Science",
    hints: ["It carries genetic information.", "It has a double helix shape.", "It is found in every living cell."],
    rankedWords: ["dna","gene","chromosome","cell","genetic","helix","heredity","biology","nucleus","code","mutation","protein","strand","rna","organism","trait","ancestry","lab","sequence","science","replication","blueprint"]
  },
  {
    target: "telescope",
    category: "Science",
    hints: ["It magnifies distant objects.", "Astronomers use it to observe space.", "It has lenses or mirrors."],
    rankedWords: ["telescope","lens","star","astronomy","observatory","sky","planet","mirror","magnify","space","night","universe","zoom","galaxy","view","scope","tripod","moon","discover","science","focus","eyepiece"]
  },
  {
    target: "chemistry",
    category: "Science",
    hints: ["It studies substances and their reactions.", "It involves mixing chemicals in a lab.", "Elements combine to form compounds."],
    rankedWords: ["chemistry","chemical","reaction","lab","element","compound","molecule","beaker","experiment","formula","acid","mixture","solution","atom","bond","science","testtube","catalyst","gas","liquid","periodic","teacher"]
  },
  {
    target: "electricity",
    category: "Science",
    hints: ["It powers lights and appliances.", "It flows through wires as current.", "Lightning is a natural form of it."],
    rankedWords: ["electricity","current","wire","circuit","power","energy","voltage","spark","charge","plug","outlet","battery","generator","conductor","volt","electric","lightning","grid","switch","bulb","static","electron"]
  },
  {
    target: "tennis",
    category: "Sports",
    hints: ["Players hit a ball over a net.", "It is played with a racket.", "Matches are scored in sets and games."],
    rankedWords: ["tennis","racket","ball","net","court","serve","match","player","ace","volley","tournament","grandslam","umpire","doubles","singles","backhand","forehand","score","wimbledon","coach","bounce","sneakers"]
  },
  {
    target: "swimming",
    category: "Sports",
    hints: ["It takes place in water.", "Athletes use strokes to move.", "It is an event at the Olympics."],
    rankedWords: ["swimming","pool","stroke","water","lane","dive","goggles","swimmer","freestyle","backstroke","lap","coach","olympics","splash","cap","chlorine","medal","race","breathe","kick","float","competition"]
  },
  {
    target: "baseball",
    category: "Sports",
    hints: ["A pitcher throws to a batter.", "Players run around bases.", "It is played with a bat and glove."],
    rankedWords: ["baseball","bat","pitcher","glove","base","homerun","diamond","inning","batter","catcher","field","stadium","umpire","strike","mound","team","ball","dugout","fastball","mlb","fan","score"]
  },
  {
    target: "boxing",
    category: "Sports",
    hints: ["Two fighters compete wearing gloves.", "It takes place in a ring.", "A knockout can end the match."],
    rankedWords: ["boxing","glove","ring","punch","fighter","knockout","referee","match","round","bout","jab","uppercut","championship","boxer","sweat","bell","corner","trainer","belt","spar","weightclass","cheer"]
  },
  {
    target: "cycling",
    category: "Sports",
    hints: ["It involves riding a bicycle.", "Riders wear helmets for safety.", "It can be a race or leisure activity."],
    rankedWords: ["cycling","bicycle","pedal","helmet","wheel","race","rider","gear","tour","road","handlebar","speed","chain","sport","fitness","trail","spandex","marathon","path","brake","exercise","endurance"]
  },
  {
    target: "rocket",
    category: "Space",
    hints: ["It launches into space.", "It uses powerful engines and fuel.", "It carries astronauts or satellites."],
    rankedWords: ["rocket","launch","spacecraft","fuel","engine","nasa","orbit","astronaut","booster","liftoff","space","mission","countdown","thrust","capsule","satellite","gravity","moon","flight","exhaust","pad","ignition"]
  },
  {
    target: "astronaut",
    category: "Space",
    hints: ["This person travels into space.", "They wear a special suit.", "They may work on a space station."],
    rankedWords: ["astronaut","spacesuit","space","nasa","rocket","mission","orbit","spacewalk","capsule","moon","gravity","helmet","station","cosmonaut","crew","training","shuttle","oxygen","exploration","zerogravity","launch","floating"]
  },
  {
    target: "satellite",
    category: "Space",
    hints: ["It orbits the Earth.", "It relays signals like TV and GPS.", "It was launched into space by a rocket."],
    rankedWords: ["satellite","orbit","space","signal","gps","communication","dish","launch","earth","transmission","network","weather","station","telescope","antenna","rocket","data","sky","navigation","broadcast","relay","mission"]
  },
  {
    target: "mars",
    category: "Space",
    hints: ["It is known as the Red Planet.", "Rovers have explored its surface.", "It is the fourth planet from the sun."],
    rankedWords: ["mars","planet","red","rover","nasa","space","orbit","exploration","dust","crater","moon","atmosphere","mission","surface","astronaut","solarsystem","sky","discovery","rocket","life","dry","telescope"]
  },
  {
    target: "comet",
    category: "Space",
    hints: ["It has a glowing tail as it nears the sun.", "It is made of ice and dust.", "It orbits the sun on a long path."],
    rankedWords: ["comet","tail","ice","orbit","space","sky","asteroid","dust","sun","nucleus","meteor","telescope","glow","streak","night","astronomy","solarsystem","halley","path","frozen","discovery","vapor"]
  },
  {
    target: "blackhole",
    category: "Space",
    hints: ["Nothing can escape its gravity, not even light.", "It forms after a massive star collapses.", "It has an event horizon."],
    rankedWords: ["blackhole","gravity","space","star","singularity","horizon","collapse","mass","universe","astronomy","void","light","telescope","galaxy","dense","warp","cosmic","mysterious","physics","dark","orbit","matter"]
  },
  {
    target: "piano",
    category: "Music",
    hints: ["It has black and white keys.", "You play it by pressing keys.", "It can be acoustic or electric."],
    rankedWords: ["piano","keys","keyboard","note","melody","chord","pianist","music","sheetmusic","grand","bench","hammer","string","concert","practice","scale","tune","blackkeys","whitekeys","recital","sound","compose"]
  },
  {
    target: "drum",
    category: "Music",
    hints: ["It is a percussion instrument.", "You hit it with sticks or hands.", "It keeps the rhythm in a band."],
    rankedWords: ["drum","drumstick","beat","rhythm","percussion","snare","cymbal","band","kit","tempo","bassdrum","tap","drummer","music","stage","groove","tom","symphony","march","pound","roll","concert"]
  },
  {
    target: "orchestra",
    category: "Music",
    hints: ["It is a large group of musicians.", "It plays classical compositions together.", "A conductor leads it."],
    rankedWords: ["orchestra","conductor","symphony","violin","musician","concert","instrument","string","brass","woodwind","classical","ensemble","baton","hall","performance","sheetmusic","harmony","composer","stage","chair","tuning","applause"]
  },
  {
    target: "microphone",
    category: "Music",
    hints: ["It captures sound to amplify it.", "Singers and speakers use it.", "It plugs into a sound system."],
    rankedWords: ["microphone","sound","singer","amplifier","speaker","stage","recording","voice","studio","wire","stand","karaoke","audio","podcast","concert","mic","feedback","cable","broadcast","volume","echo","performance"]
  },
  {
    target: "violin",
    category: "Music",
    hints: ["It is a string instrument played with a bow.", "It is held under the chin.", "It is a key part of an orchestra."],
    rankedWords: ["violin","bow","string","orchestra","music","fiddle","chinrest","wood","note","melody","classical","musician","concert","strad","resin","pluck","scale","sheetmusic","symphony","tune","case","ensemble"]
  },
  {
    target: "actor",
    category: "Movies",
    hints: ["This person performs in films or plays.", "They memorize lines called a script.", "They may win awards for their roles."],
    rankedWords: ["actor","actress","film","role","script","stage","hollywood","character","performance","movie","audition","award","director","scene","celebrity","fame","camera","theater","cast","rehearsal","star","spotlight"]
  },
  {
    target: "director",
    category: "Movies",
    hints: ["This person guides the making of a film.", "They sit behind the camera calling the shots.", "They shout 'action' and 'cut'."],
    rankedWords: ["director","film","camera","movie","script","action","cut","scene","crew","hollywood","production","screenplay","cast","editing","vision","set","studio","award","story","shot","budget","oscar"]
  },
  {
    target: "animation",
    category: "Movies",
    hints: ["It brings drawings or models to life.", "It is often made frame by frame.", "Cartoons use this technique."],
    rankedWords: ["animation","cartoon","drawing","animator","frame","pixar","character","studio","sketch","movie","disney","cgi","motion","storyboard","render","film","sequence","illustration","voiceactor","screen","digital","art"]
  },
  {
    target: "superhero",
    category: "Movies",
    hints: ["This character has extraordinary powers.", "They often wear a costume and mask.", "They fight villains to save people."],
    rankedWords: ["superhero","cape","mask","power","villain","comic","costume","hero","rescue","sidekick","city","secretidentity","movie","marvel","strength","justice","battle","origin","comicbook","save","flight","super"]
  },
  {
    target: "documentary",
    category: "Movies",
    hints: ["It presents real events or facts.", "It is a non-fiction style of film.", "It often includes interviews and narration."],
    rankedWords: ["documentary","film","narrator","footage","interview","factual","nonfiction","camera","subject","story","research","director","real","education","history","investigate","screening","streaming","wildlife","crew","script","truth"]
  },
  {
    target: "bedroom",
    category: "Household",
    hints: ["It is where people sleep.", "It usually has a bed and closet.", "It is a private room in the home."],
    rankedWords: ["bedroom","bed","pillow","blanket","closet","sleep","dresser","lamp","nightstand","mattress","curtain","sheets","wardrobe","alarm","cozy","night","rest","room","furniture","quiet","window","carpet"]
  },
  {
    target: "bathroom",
    category: "Household",
    hints: ["It has a sink, toilet, and shower.", "People wash and get ready here.", "It is a private room for hygiene."],
    rankedWords: ["bathroom","sink","toilet","shower","bathtub","mirror","towel","soap","faucet","tile","drain","shampoo","hygiene","plumbing","water","mat","bath","restroom","wash","cabinet","curtain","robe"]
  },
  {
    target: "garden",
    category: "Household",
    hints: ["Plants and flowers are grown here.", "It is often located outdoors.", "It requires watering and weeding."],
    rankedWords: ["garden","flower","plant","soil","seed","water","gardener","bloom","weed","shovel","pot","vegetable","grow","hose","greenhouse","bee","sunshine","fence","patio","rake","lawn","harvest"]
  },
  {
    target: "furniture",
    category: "Household",
    hints: ["It includes chairs, tables, and sofas.", "It fills and decorates a room.", "It can be made of wood or metal."],
    rankedWords: ["furniture","chair","table","sofa","couch","wood","shelf","cabinet","desk","drawer","upholstery","decor","room","design","cushion","bookshelf","dining","livingroom","wardrobe","seat","assembly","store"]
  },
  {
    target: "laundry",
    category: "Household",
    hints: ["It involves washing dirty clothes.", "It uses a washer and dryer.", "Clothes are folded afterward."],
    rankedWords: ["laundry","washer","dryer","detergent","clothes","fold","basket","soap","fabric","stain","wash","dry","hamper","iron","softener","cycle","spin","clean","load","hang","chore","wrinkle"]
  },
  {
    target: "teacher",
    category: "Jobs",
    hints: ["This person educates students.", "They work in a classroom.", "They grade tests and homework."],
    rankedWords: ["teacher","classroom","student","lesson","school","chalkboard","grade","homework","lecture","education","textbook","principal","subject","desk","exam","teach","curriculum","tutor","pupil","learning","faculty","reportcard"]
  },
  {
    target: "engineer",
    category: "Jobs",
    hints: ["This person designs and builds systems.", "They solve technical problems.", "They may work with machines or structures."],
    rankedWords: ["engineer","design","blueprint","build","technical","machine","project","construction","math","science","structure","solution","invent","mechanical","software","electrical","plan","innovation","testing","prototype","technology","calculate"]
  },
  {
    target: "firefighter",
    category: "Jobs",
    hints: ["This person puts out fires.", "They wear a helmet and heavy gear.", "They rescue people from danger."],
    rankedWords: ["firefighter","fire","hose","truck","helmet","rescue","hydrant","siren","station","smoke","flame","emergency","ladder","hero","extinguish","brigade","uniform","danger","water","alarm","gear","save"]
  },
  {
    target: "chef",
    category: "Jobs",
    hints: ["This person prepares meals professionally.", "They work in a kitchen.", "They may run a restaurant's menu."],
    rankedWords: ["chef","kitchen","cook","recipe","restaurant","knife","apron","menu","dish","ingredient","souschef","culinary","stove","plate","taste","garnish","cuisine","hat","prep","saute","kitchenstaff","service"]
  },
  {
    target: "police",
    category: "Jobs",
    hints: ["This person enforces the law.", "They wear a badge and uniform.", "They patrol streets to keep order."],
    rankedWords: ["police","officer","badge","uniform","patrol","siren","arrest","law","crime","precinct","handcuffs","cruiser","detective","justice","enforcement","radio","investigate","suspect","safety","station","duty","protect"]
  },
  {
    target: "bicycle",
    category: "Transport",
    hints: ["It has two wheels and pedals.", "You balance and steer it yourself.", "It is a common way to commute short distances."],
    rankedWords: ["bicycle","bike","pedal","wheel","handlebar","chain","gear","helmet","ride","seat","spoke","brake","tire","cyclist","path","commute","basket","frame","kickstand","exercise","speed","lane"]
  },
  {
    target: "ship",
    category: "Transport",
    hints: ["It travels across water.", "It can carry cargo or passengers.", "It has a hull and sails or engines."],
    rankedWords: ["ship","sail","ocean","hull","captain","deck","port","cargo","voyage","anchor","crew","sea","harbor","vessel","navy","mast","boat","cruise","dock","wave","navigation","freight"]
  },
  {
    target: "helicopter",
    category: "Transport",
    hints: ["It has spinning rotor blades on top.", "It can hover in place.", "It is used for rescue missions."],
    rankedWords: ["helicopter","rotor","blade","hover","pilot","cockpit","rescue","chopper","aviation","sky","flight","propeller","land","aircraft","medevac","engine","spin","military","tail","airfield","whirl","altitude"]
  },
  {
    target: "truck",
    category: "Transport",
    hints: ["It is used to haul heavy loads.", "It has a large cargo bed or trailer.", "It is common on highways."],
    rankedWords: ["truck","cargo","trailer","driver","highway","haul","engine","wheel","cab","freight","load","delivery","diesel","road","semi","tire","logistics","warehouse","route","gear","horn","garage"]
  },
  {
    target: "subway",
    category: "Transport",
    hints: ["It is an underground train system.", "It runs beneath city streets.", "Commuters use it to avoid traffic."],
    rankedWords: ["subway","underground","train","tunnel","station","commute","platform","ticket","rail","city","transit","metro","passenger","car","track","fare","escalator","urban","schedule","crowd","map","route"]
  },
  {
    target: "island",
    category: "Geography",
    hints: ["It is surrounded by water on all sides.", "It can be small or large.", "It is often reached by boat or plane."],
    rankedWords: ["island","sea","ocean","beach","coast","tropical","shore","archipelago","land","water","isolated","palm","boat","reef","sand","lagoon","remote","coconut","volcanic","map","harbor","tide"]
  },
  {
    target: "continent",
    category: "Geography",
    hints: ["It is a large landmass on Earth.", "There are seven of them.", "Countries are grouped within it."],
    rankedWords: ["continent","land","earth","country","map","border","ocean","region","world","geography","landmass","population","culture","terrain","hemisphere","nation","africa","asia","europe","atlas","plate","divide"]
  },
  {
    target: "canyon",
    category: "Geography",
    hints: ["It is a deep, narrow valley with steep sides.", "Rivers often carve it over time.", "It can be a popular hiking destination."],
    rankedWords: ["canyon","cliff","valley","rock","gorge","river","erosion","hike","cave","ridge","desert","landscape","trail","formation","layer","redrock","nationalpark","view","ravine","steep","geology","echo"]
  },
  {
    target: "peninsula",
    category: "Geography",
    hints: ["It is land surrounded by water on three sides.", "It juts out from a larger landmass.", "Coastlines wrap around most of it."],
    rankedWords: ["peninsula","coast","land","water","sea","shore","isthmus","map","geography","border","ocean","tip","bay","region","coastline","cape","connected","surrounded","terrain","headland","gulf","landform"]
  },
  {
    target: "plateau",
    category: "Geography",
    hints: ["It is a large area of flat, elevated land.", "It rises above the surrounding terrain.", "Erosion can shape its edges over time."],
    rankedWords: ["plateau","elevation","flat","highland","terrain","mesa","cliff","land","geography","altitude","rock","erosion","ridge","landscape","region","tableland","steppe","formation","view","plain","geology","expanse"]
  },
  {
    target: "castle",
    category: "History",
    hints: ["It was built for defense in medieval times.", "It often has towers and thick walls.", "Kings and queens once lived here."],
    rankedWords: ["castle","tower","moat","king","queen","knight","wall","drawbridge","fortress","medieval","throne","kingdom","stone","siege","courtyard","banner","dungeon","royalty","battlement","gate","guard","legend"]
  },
  {
    target: "knight",
    category: "History",
    hints: ["This warrior wore armor in medieval times.", "They served a king or lord.", "They fought with a sword on horseback."],
    rankedWords: ["knight","armor","sword","shield","horse","castle","medieval","chivalry","king","joust","honor","quest","lance","helmet","battle","kingdom","warrior","crest","tournament","code","squire","legend"]
  },
  {
    target: "empire",
    category: "History",
    hints: ["It is a large territory ruled by one power.", "It often expands through conquest.", "It can span many countries and cultures."],
    rankedWords: ["empire","conquest","ruler","territory","kingdom","army","expansion","colony","power","throne","civilization","dynasty","war","emperor","rule","nation","ancient","rome","land","subjects","capital","legacy"]
  },
  {
    target: "revolution",
    category: "History",
    hints: ["It is a major uprising against a government.", "It often leads to dramatic political change.", "Citizens rebel to demand new rights."],
    rankedWords: ["revolution","rebellion","uprising","protest","change","freedom","government","war","independence","reform","revolt","citizens","movement","liberty","overthrow","riot","cause","march","ideology","historic","leader","struggle"]
  },
  {
    target: "medieval",
    category: "History",
    hints: ["This era included castles and knights.", "It took place in the Middle Ages.", "Kingdoms and feudal lords ruled during this time."],
    rankedWords: ["medieval","castle","knight","kingdom","feudal","sword","armor","king","peasant","era","middleages","lord","village","church","plague","jousting","monastery","chivalry","throne","banner","historic","siege"]
  },
  {
    target: "colony",
    category: "History",
    hints: ["It is a settlement controlled by a distant ruling country.", "Settlers moved here to build new lives.", "Many became independent nations later."],
    rankedWords: ["colony","settler","settlement","territory","empire","independence","land","ruler","trade","government","expedition","founding","migration","governor","plantation","tax","rebellion","frontier","homeland","colonist","flag","treaty"]
  },
  {
    target: "thunder",
    category: "Nature",
    hints: ["It is the loud sound after lightning.", "It often follows a bright flash in the sky.", "It can rumble during a storm."],
    rankedWords: ["thunder","lightning","storm","rain","boom","clap","sky","cloud","rumble","flash","thunderstorm","weather","loud","crack","dark","noise","downpour","strike","echo","roll","electric","summer","warning","wind","roar","gray"]
  },
  {
    target: "storm",
    category: "Nature",
    hints: ["It brings heavy rain and strong winds.", "It can include thunder and lightning.", "Ships and travelers watch for it."],
    rankedWords: ["storm","rain","wind","thunder","lightning","cloud","weather","hurricane","downpour","gale","flood","dark","forecast","warning","gust","tempest","clouds","shelter","umbrella","gray","howl","waves","cyclone","chaos","alert","brew"]
  },
  {
    target: "snow",
    category: "Nature",
    hints: ["It falls as soft white flakes.", "It covers the ground in winter.", "Children build men out of it."],
    rankedWords: ["snow","snowflake","winter","cold","ice","white","frost","blizzard","snowman","sled","snowball","chill","frozen","flurry","snowfall","mountain","ski","snowplow","glove","boot","icy","december","frosty","powder","slush","drift"]
  },
  {
    target: "sunrise",
    category: "Nature",
    hints: ["It happens at the start of the day.", "The sky turns orange and pink.", "The sun appears over the horizon."],
    rankedWords: ["sunrise","dawn","morning","horizon","sun","sky","light","orange","pink","daybreak","early","glow","east","golden","rise","warmth","clouds","silhouette","calm","beautiful","daylight","hope","new","beach","hill","peaceful"]
  },
  {
    target: "tiger",
    category: "Animals",
    hints: ["It has orange fur with black stripes.", "It is one of the biggest wild cats.", "It hunts alone in the jungle."],
    rankedWords: ["tiger","stripe","jungle","predator","claw","roar","fur","orange","big","wild","cat","hunt","prey","asia","fang","forest","endangered","zoo","paw","fierce","stealth","stripes","den","carnivore","strong","territory"]
  },
  {
    target: "giraffe",
    category: "Animals",
    hints: ["It has a very long neck.", "It eats leaves from tall trees.", "It is the tallest land animal."],
    rankedWords: ["giraffe","neck","tall","spots","africa","savanna","leaves","tree","herbivore","legs","herd","zoo","wildlife","yellow","brown","gentle","grass","safari","towering","gallop","patches","browsing","gaze","calf","everyday"]
  },
  {
    target: "monkey",
    category: "Animals",
    hints: ["It swings through trees using its arms.", "It is closely related to apes.", "It often eats bananas."],
    rankedWords: ["monkey","banana","jungle","tree","primate","swing","tail","ape","branch","troop","climb","chimp","forest","zoo","playful","chatter","grip","wild","mischief","fur","vine","curious","canopy","howl","peel"]
  },
  {
    target: "rabbit",
    category: "Animals",
    hints: ["It has long ears and a fluffy tail.", "It hops instead of walking.", "It lives in a burrow underground."],
    rankedWords: ["rabbit","bunny","hop","burrow","ears","carrot","fur","fluffy","hare","warren","cute","nose","wild","pet","tail","cottontail","hutch","spring","garden","meadow","twitch","soft","litter","field","nibble"]
  },
  {
    target: "banana",
    category: "Food",
    hints: ["It is a curved yellow fruit.", "Monkeys are often shown eating it.", "It grows in bunches on trees."],
    rankedWords: ["banana","yellow","fruit","peel","bunch","tropical","monkey","smoothie","sweet","potassium","curved","ripe","snack","bread","split","plantain","market","soft","tree","fiber","dessert","fresh","muffin","slice","everyday"]
  },
  {
    target: "apple",
    category: "Food",
    hints: ["It can be red, green, or yellow.", "It grows on trees and is picked in fall.", "Doctors say one a day keeps them away."],
    rankedWords: ["apple","fruit","red","tree","orchard","juice","pie","core","seed","crisp","sweet","cider","bite","basket","fall","harvest","snack","green","stem","market","sauce","slice","fresh","peel","crunchy"]
  },
  {
    target: "sandwich",
    category: "Food",
    hints: ["It is made with two slices of bread.", "It has fillings like cheese or meat.", "It is a common lunch item."],
    rankedWords: ["sandwich","bread","slice","filling","lunch","cheese","meat","lettuce","mustard","mayo","toast","deli","wrap","picnic","snack","layered","club","panini","bite","bag","packed","fresh","ham","spread","crust"]
  },
  {
    target: "bakery",
    category: "Food",
    hints: ["It is a shop that sells bread and pastries.", "The smell of fresh dough fills the air.", "Cakes and cookies are often made here."],
    rankedWords: ["bakery","bread","pastry","oven","dough","cake","baker","fresh","muffin","cookie","croissant","flour","sweet","shop","bun","aroma","display","counter","warm","loaf","icing","treats","kitchen","apron","market"]
  },
  {
    target: "suitcase",
    category: "Travel",
    hints: ["It is used to pack clothes for a trip.", "It usually has wheels and a handle.", "You check it in at the airport."],
    rankedWords: ["suitcase","luggage","pack","travel","handle","wheels","trip","airport","clothes","zipper","bag","vacation","tag","carryon","hardshell","fold","strap","journey","hotel","checkin","organize","weight","label","carousel","stuff"]
  },
  {
    target: "museum",
    category: "Travel",
    hints: ["It displays historical or artistic objects.", "Visitors walk through quiet exhibit halls.", "It preserves items from the past."],
    rankedWords: ["museum","exhibit","history","art","gallery","artifact","tour","display","curator","collection","statue","painting","admission","culture","ancient","glass","hall","guide","visit","relic","preserve","education","sculpture","ticket","learn"]
  },
  {
    target: "village",
    category: "Travel",
    hints: ["It is a small community smaller than a town.", "Houses are close together with a shared center.", "It often has a quiet, rural feel."],
    rankedWords: ["village","town","rural","community","houses","countryside","farm","market","neighbors","small","cottage","square","local","quiet","tradition","population","road","field","church","gathering","chapel","lane","harvest","folk","hamlet"]
  },
  {
    target: "stadium",
    category: "Travel",
    hints: ["It is a large venue for sports events.", "Thousands of fans fill its seats.", "It often has a field in the middle."],
    rankedWords: ["stadium","arena","crowd","seats","field","sports","fans","game","cheer","tickets","bleachers","event","concert","lights","turf","score","team","gate","roar","venue","match","entrance","banner","tunnel","capacity"]
  },
  {
    target: "keyboard",
    category: "Technology",
    hints: ["You type on it to enter text.", "It has letters, numbers, and symbols.", "It connects to a computer."],
    rankedWords: ["keyboard","keys","type","computer","letters","typing","laptop","qwerty","button","input","shortcut","space","enter","tab","click","wireless","desk","monitor","cable","mouse","code","word","press","layout","mechanical"]
  },
  {
    target: "printer",
    category: "Technology",
    hints: ["It puts words and images onto paper.", "It connects to a computer or network.", "It uses ink or toner."],
    rankedWords: ["printer","paper","ink","print","toner","document","scanner","office","copy","page","cartridge","laser","inkjet","tray","output","device","wireless","photo","report","queue","jam","cable","file","desk","fax"]
  },
  {
    target: "calculator",
    category: "Technology",
    hints: ["It helps you solve math problems.", "It has buttons for numbers and operations.", "Students use it during exams."],
    rankedWords: ["calculator","numbers","math","buttons","add","subtract","multiply","divide","screen","equation","solve","school","device","digits","formula","exam","total","sum","display","battery","function","key","arithmetic","result","pocket"]
  },
  {
    target: "headphones",
    category: "Technology",
    hints: ["You wear them over your ears to listen to sound.", "They connect to a phone or music player.", "They can be wired or wireless."],
    rankedWords: ["headphones","earbuds","music","sound","ears","wireless","audio","volume","listen","bluetooth","speaker","cable","microphone","podcast","noise","cancelling","plug","band","device","song","stereo","charge","case","cushion","jack"]
  },
  {
    target: "planet",
    category: "Science",
    hints: ["It orbits a star like our sun.", "Earth is one example of it.", "It can be rocky or gas-covered."],
    rankedWords: ["planet","orbit","earth","sun","space","mars","solarsystem","moon","gravity","astronomy","rotation","atmosphere","universe","star","science","sky","telescope","discovery","rocky","gas","distance","satellite","system","celestial","cosmic"]
  },
  {
    target: "asteroid",
    category: "Science",
    hints: ["It is a rocky object that orbits the sun.", "It is smaller than a planet.", "It can be found in a belt between Mars and Jupiter."],
    rankedWords: ["asteroid","rock","space","orbit","belt","meteor","crater","impact","comet","solarsystem","debris","mars","jupiter","science","telescope","collision","stone","field","chunk","mining","nasa","gravity","fragment","cosmic","tracking"]
  },
  {
    target: "magnet",
    category: "Science",
    hints: ["It attracts metal objects like iron.", "It has a north and south pole.", "It sticks to a refrigerator."],
    rankedWords: ["magnet","attract","metal","iron","pole","force","fridge","magnetic","field","science","north","south","pull","steel","experiment","compass","physics","stick","repel","invisible","classroom","toy","electromagnet","charge","strong"]
  },
  {
    target: "microscope",
    category: "Science",
    hints: ["It magnifies objects too small to see.", "Scientists use it to study cells.", "It has a lens and a stage for samples."],
    rankedWords: ["microscope","lens","magnify","cell","science","lab","slide","tiny","biology","observe","specimen","zoom","research","eyepiece","focus","classroom","germ","study","detail","light","scientist","sample","view","experiment","precision"]
  },
  {
    target: "football",
    category: "Sports",
    hints: ["Players try to score a touchdown.", "It is played with an oval ball.", "Teams battle for yards on a field."],
    rankedWords: ["football","touchdown","field","quarterback","tackle","team","helmet","pass","yard","stadium","coach","goalpost","huddle","kick","referee","offense","defense","gridiron","league","fans","play","snap","score","jersey","block"]
  },
  {
    target: "cricket",
    category: "Sports",
    hints: ["It is played with a bat and a small ball.", "A bowler throws the ball toward a wicket.", "It is very popular in England and India."],
    rankedWords: ["cricket","bat","bowler","wicket","pitch","innings","stump","boundary","team","over","run","fielder","umpire","match","ball","stadium","batsman","test","catch","score","league","helmet","crease","tour","captain"]
  },
  {
    target: "running",
    category: "Sports",
    hints: ["It involves moving quickly on foot.", "People do it for exercise or in races.", "Marathons are a long form of it."],
    rankedWords: ["running","jog","marathon","race","sprint","exercise","track","shoes","fitness","stamina","pace","runner","trail","finish","training","cardio","endurance","stride","breath","fast","laps","warmup","treadmill","athlete","route"]
  },
  {
    target: "golf",
    category: "Sports",
    hints: ["Players hit a small ball into holes.", "It is played on a large grassy course.", "A club is used to strike the ball."],
    rankedWords: ["golf","club","ball","course","hole","tee","swing","putt","fairway","caddie","green","bunker","score","par","cart","bag","driver","links","tournament","stroke","flag","chip","sand","clubhouse","match"]
  },
  {
    target: "sun",
    category: "Space",
    hints: ["It is the star at the center of our solar system.", "It provides light and warmth to Earth.", "It rises in the east and sets in the west."],
    rankedWords: ["sun","star","light","warmth","solarsystem","sky","rays","heat","daylight","planet","sunrise","sunset","energy","bright","astronomy","orbit","yellow","summer","shine","earth","horizon","solar","glow","radiant","core"]
  },
  {
    target: "moon",
    category: "Space",
    hints: ["It orbits the Earth.", "It appears to change shape through the month.", "Astronauts have walked on its surface."],
    rankedWords: ["moon","orbit","earth","night","crater","lunar","astronaut","sky","phase","glow","tide","satellite","space","nasa","surface","rocket","stars","fullmoon","dark","gravity","explore","landing","reflect","dust","cycle"]
  },
  {
    target: "meteor",
    category: "Space",
    hints: ["It is a streak of light in the night sky.", "It burns up as it enters Earth's atmosphere.", "People call it a shooting star."],
    rankedWords: ["meteor","shootingstar","sky","streak","space","asteroid","burn","atmosphere","night","wish","comet","fireball","trail","glow","fall","crater","cosmic","fast","light","meteorite","observe","telescope","flash","rare","astronomy"]
  },
  {
    target: "spaceship",
    category: "Space",
    hints: ["It carries astronauts beyond Earth.", "It launches using powerful rockets.", "It can travel to the moon or other planets."],
    rankedWords: ["spaceship","rocket","astronaut","launch","nasa","orbit","crew","spacecraft","mission","capsule","engine","space","moon","fuel","cockpit","voyage","exploration","thruster","docking","station","gravity","cosmic","flight","countdown","pilot"]
  },
  {
    target: "singer",
    category: "Music",
    hints: ["This person performs songs for an audience.", "They may record albums in a studio.", "Their voice is their main instrument."],
    rankedWords: ["singer","voice","song","microphone","concert","album","stage","music","vocalist","performer","melody","lyrics","studio","fans","tour","chart","band","recording","audience","spotlight","harmony","fame","note","celebrity","talent"]
  },
  {
    target: "album",
    category: "Music",
    hints: ["It is a collection of songs released together.", "Artists spend months recording it.", "Fans wait for its release date."],
    rankedWords: ["album","song","tracklist","release","artist","music","record","studio","single","cover","chart","vinyl","playlist","streaming","hit","band","producer","recording","launch","fans","discography","tour","lyrics","genre","download"]
  },
  {
    target: "trumpet",
    category: "Music",
    hints: ["It is a brass instrument played by blowing air.", "It has three valves pressed to change notes.", "It is common in jazz bands."],
    rankedWords: ["trumpet","brass","valve","horn","jazz","band","blow","mouthpiece","note","music","orchestra","player","shiny","fanfare","marching","sound","musician","tune","concert","section","gold","instrument","melody","practice","reed"]
  },
  {
    target: "karaoke",
    category: "Music",
    hints: ["People sing along to instrumental tracks.", "Lyrics are shown on a screen.", "It is a fun activity at parties or bars."],
    rankedWords: ["karaoke","sing","microphone","lyrics","screen","song","party","bar","performance","music","track","fun","stage","crowd","voice","tune","booth","applause","playlist","friends","night","celebration","duet","cheer","spotlight"]
  },
  {
    target: "comedy",
    category: "Movies",
    hints: ["It is meant to make audiences laugh.", "It often has funny characters and situations.", "Stand-up performers work in this genre too."],
    rankedWords: ["comedy","funny","laugh","humor","joke","genre","film","sitcom","punchline","actor","script","satire","parody","audience","comedian","lighthearted","gag","banter","standup","witty","silly","spoof","fun","timing","slapstick"]
  },
  {
    target: "mystery",
    category: "Movies",
    hints: ["It involves solving a puzzling crime or secret.", "Clues are revealed throughout the story.", "A detective is often the main character."],
    rankedWords: ["mystery","detective","clue","crime","suspense","investigate","suspect","plot","twist","secret","solve","whodunit","evidence","thriller","case","noir","puzzle","mysterious","witness","unravel","riddle","clueless","enigma","shadow","reveal"]
  },
  {
    target: "popcorn",
    category: "Movies",
    hints: ["It is a crunchy snack often eaten at the cinema.", "Kernels pop open when heated.", "It is often salted or buttered."],
    rankedWords: ["popcorn","snack","cinema","butter","salt","kernel","bucket","movie","crunchy","theater","pop","bag","salty","treat","concession","fluffy","bowl","microwave","corn","munch","classic","tub","warm","white","crisp"]
  },
  {
    target: "screenplay",
    category: "Movies",
    hints: ["It is the written script for a film.", "It includes dialogue and scene directions.", "Writers spend months crafting its story."],
    rankedWords: ["screenplay","script","dialogue","scene","writer","story","film","draft","format","plot","character","direction","act","page","studio","pitch","narrative","revision","producer","adaptation","outline","structure","industry","everyday","familiar"]
  },
  {
    target: "blanket",
    category: "Household",
    hints: ["It keeps you warm while sleeping.", "It is often placed on a bed or sofa.", "It can be soft, wool, or fleece."],
    rankedWords: ["blanket","warm","bed","cozy","sleep","fleece","wool","cover","soft","quilt","throw","comforter","winter","snug","couch","fabric","fold","nap","cotton","weighted","texture","home","knit","layer","cuddle"]
  },
  {
    target: "candle",
    category: "Household",
    hints: ["It provides light through a burning wick.", "It can have a pleasant scent.", "It is often lit during dinners or celebrations."],
    rankedWords: ["candle","wax","flame","wick","light","scent","glow","holder","melt","fire","aroma","birthday","romantic","tealight","fragrance","burn","dark","warm","decor","match","spa","relax","soft","flicker","dinner"]
  },
  {
    target: "sofa",
    category: "Household",
    hints: ["It is a long cushioned seat for a living room.", "Several people can sit on it at once.", "It often faces a television."],
    rankedWords: ["sofa","couch","cushion","livingroom","seat","comfortable","furniture","fabric","recliner","lounge","armrest","pillow","relax","nap","television","home","leather","sit","d\u00e9cor","loveseat","upholstery","family","cozy","room","stretch"]
  },
  {
    target: "window",
    category: "Household",
    hints: ["It lets light into a room.", "It can be opened for fresh air.", "Curtains often hang beside it."],
    rankedWords: ["window","glass","frame","curtain","view","light","sill","open","house","room","pane","breeze","shade","blind","reflection","sunlight","screen","ledge","outside","daylight","clean","latch","home","air","transparent"]
  },
  {
    target: "nurse",
    category: "Jobs",
    hints: ["This person cares for patients in a hospital.", "They assist doctors and administer medicine.", "They often wear scrubs."],
    rankedWords: ["nurse","hospital","patient","medicine","care","scrubs","clinic","health","doctor","injection","stethoscope","ward","shift","bandage","checkup","treatment","vitals","compassion","medical","emergency","chart","assist","recovery","hygiene","everyday"]
  },
  {
    target: "lawyer",
    category: "Jobs",
    hints: ["This person represents clients in legal matters.", "They argue cases in a courtroom.", "They study law for many years."],
    rankedWords: ["lawyer","court","law","case","judge","client","justice","attorney","trial","evidence","argument","legal","contract","verdict","defense","prosecutor","brief","suit","hearing","witness","office","gavel","litigation","counsel","everyday"]
  },
  {
    target: "mechanic",
    category: "Jobs",
    hints: ["This person repairs cars and engines.", "They work in a garage with tools.", "They diagnose problems under the hood."],
    rankedWords: ["mechanic","car","engine","garage","repair","tools","wrench","grease","tire","oil","vehicle","auto","diagnose","bolt","workshop","overhaul","brake","service","shop","parts","fix","technician","hood","inspect","maintenance"]
  },
  {
    target: "plumber",
    category: "Jobs",
    hints: ["This person fixes pipes and leaks.", "They work with water systems in homes.", "They carry wrenches and other tools."],
    rankedWords: ["plumber","pipe","leak","water","wrench","sink","drain","repair","toilet","faucet","tools","plumbing","clog","fix","valve","home","service","pressure","install","hose","bathroom","kitchen","technician","fitting","tank"]
  },
  {
    target: "bus",
    category: "Transport",
    hints: ["It carries many passengers along a fixed route.", "It stops at designated stops.", "It is a common form of public transport."],
    rankedWords: ["bus","route","passenger","stop","driver","fare","transit","seat","school","transport","commute","public","ride","schedule","aisle","depot","city","road","ticket","luggage","doubledecker","station","travel","window","journey"]
  },
  {
    target: "taxi",
    category: "Transport",
    hints: ["It is a car hired to transport passengers.", "You can hail it on the street.", "It runs on a meter or set fare."],
    rankedWords: ["taxi","cab","driver","fare","meter","ride","street","hail","passenger","yellow","car","city","trip","dispatch","route","service","booking","license","curb","destination","luggage","night","travel","stand","radio"]
  },
  {
    target: "airplane",
    category: "Transport",
    hints: ["It flies through the sky carrying passengers.", "It has wings and powerful engines.", "It takes off and lands at an airport."],
    rankedWords: ["airplane","wing","flight","pilot","airport","engine","runway","sky","passenger","cabin","altitude","jet","takeoff","landing","cockpit","cruise","aviation","seatbelt","luggage","turbulence","aisle","boarding","fuel","travel","cloud"]
  },
  {
    target: "scooter",
    category: "Transport",
    hints: ["It has two wheels and a standing platform.", "It is smaller and lighter than a motorcycle.", "Many people rent them in cities."],
    rankedWords: ["scooter","wheels","ride","electric","handlebar","city","commute","balance","motor","rental","helmet","speed","street","battery","lightweight","kickstand","park","app","brake","zip","compact","fun","urban","glide","short"]
  },
  {
    target: "bridge",
    category: "Geography",
    hints: ["It connects two areas across a gap.", "It is often built over a river or valley.", "Cars and pedestrians can cross it."],
    rankedWords: ["bridge","river","span","cross","road","structure","arch","cable","water","engineer","connect","crossing","steel","suspension","landmark","traffic","valley","overpass","construction","toll","view","gap","pillar","design","travel"]
  },
  {
    target: "tunnel",
    category: "Geography",
    hints: ["It is a passage that goes underground or through a mountain.", "Trains and cars can travel through it.", "It shortens long journeys."],
    rankedWords: ["tunnel","underground","passage","dark","mountain","train","road","dig","construction","light","enclosed","subway","route","excavation","engineer","echo","cave","shortcut","entrance","exit","concrete","travel","narrow","bore","cross"]
  },
  {
    target: "valley",
    category: "Geography",
    hints: ["It is low land between hills or mountains.", "A river often flows through it.", "Farmers may grow crops in its fertile soil."],
    rankedWords: ["valley","hills","mountain","river","land","lowland","farm","fertile","landscape","slope","green","scenic","gorge","stream","countryside","basin","terrain","vineyard","meadow","view","ridge","nature","canyon","field","crop"]
  },
  {
    target: "coastline",
    category: "Geography",
    hints: ["It is where the land meets the sea.", "It can be rocky or sandy.", "Ships and boats sail along its edge."],
    rankedWords: ["coastline","coast","shore","beach","sea","ocean","cliff","waves","sand","harbor","tide","boat","bay","rocky","horizon","seaside","dunes","fishing","lighthouse","port","scenic","erosion","landscape","peninsula","water"]
  },
  {
    target: "monarchy",
    category: "History",
    hints: ["It is a system ruled by a king or queen.", "Power often passes down through a royal family.", "It has existed throughout many centuries."],
    rankedWords: ["monarchy","king","queen","royal","throne","crown","kingdom","ruler","dynasty","palace","succession","empire","noble","reign","court","heir","coronation","sovereign","tradition","government","royalty","castle","subjects","power","historic"]
  },
  {
    target: "treaty",
    category: "History",
    hints: ["It is a formal agreement between nations.", "It often ends a war or conflict.", "Diplomats negotiate its terms."],
    rankedWords: ["treaty","agreement","nations","peace","negotiate","diplomat","sign","war","border","alliance","government","document","terms","history","ceasefire","pact","conference","ratify","international","policy","accord","conflict","resolve","summit","legal"]
  },
  {
    target: "ruins",
    category: "History",
    hints: ["They are the remains of an old structure.", "Archaeologists study them to learn about the past.", "They are often found in ancient cities."],
    rankedWords: ["ruins","ancient","stone","archaeologist","remains","history","excavation","broken","temple","civilization","rubble","site","artifact","discovery","overgrown","crumbling","wall","column","relic","past","dig","preserve","fragment","lost","exploration"]
  },
  {
    target: "legacy",
    category: "History",
    hints: ["It is what someone or something leaves behind.", "It can influence future generations.", "It is remembered long after events happen."],
    rankedWords: ["legacy","history","influence","impact","memory","tradition","future","inherit","remembered","achievement","generation","honor","reputation","legend","contribution","values","enduring","story","heritage","mark","lasting","record","recognition","tribute","everyday"]
  },
  {
    target: "chess",
    category: "Games",
    hints: ["It is played on a checkered board with 64 squares.", "Pieces include kings, queens, and knights.", "Players try to checkmate the opponent."],
    rankedWords: ["chess","board","king","queen","knight","bishop","pawn","rook","checkmate","strategy","move","match","tournament","piece","square","opponent","clock","gambit","player","tactic","endgame","castle","capture","thinking","classic"]
  },
  {
    target: "puzzle",
    category: "Games",
    hints: ["It challenges you to fit pieces together.", "It can be solved by matching shapes or patterns.", "Jigsaw is a popular type of it."],
    rankedWords: ["puzzle","jigsaw","pieces","solve","fit","picture","challenge","brain","game","pattern","frame","edge","match","logic","riddle","board","complete","cardboard","table","hobby","tricky","assemble","think","fun","everyday"]
  },
  {
    target: "dice",
    category: "Games",
    hints: ["It is a small cube used in games of chance.", "Each side shows a different number of dots.", "You roll it to get a random result."],
    rankedWords: ["dice","roll","cube","numbers","dots","game","random","board","gamble","pair","chance","throw","luck","table","boardgame","casino","six","sided","tumble","bet","toss","fair","player","spot","turn"]
  },
  {
    target: "arcade",
    category: "Games",
    hints: ["It is a place filled with coin-operated games.", "Bright lights and sounds fill the room.", "Players compete for high scores."],
    rankedWords: ["arcade","game","coin","joystick","highscore","cabinet","lights","sound","token","pinball","player","fun","retro","console","button","screen","competition","tickets","prize","neon","gaming","classic","machine","credits","zone"]
  },
  {
    target: "hurricane",
    category: "Weather",
    hints: ["It is a powerful storm that forms over warm ocean water.", "It has a calm center called an eye.", "It can cause major flooding and damage."],
    rankedWords: ["hurricane","storm","wind","ocean","eye","rain","flood","warning","category","evacuate","damage","cyclone","tropical","gust","surge","forecast","shelter","disaster","spiral","weather","coast","landfall","gale","alert","destruction"]
  },
  {
    target: "tornado",
    category: "Weather",
    hints: ["It is a spinning column of air that touches the ground.", "It can destroy buildings in seconds.", "It often follows severe thunderstorms."],
    rankedWords: ["tornado","funnel","wind","spin","storm","twister","destruction","warning","shelter","sky","dark","siren","damage","chase","spiral","debris","alert","weather","touchdown","powerful","danger","cloud","rotate","fierce","evacuate"]
  },
  {
    target: "drizzle",
    category: "Weather",
    hints: ["It is a light, gentle rain.", "The drops are smaller than normal rain.", "It often falls from low gray clouds."],
    rankedWords: ["drizzle","rain","light","mist","gentle","cloud","gray","damp","weather","shower","sprinkle","umbrella","soft","droplets","overcast","moist","fine","wet","spring","cool","fog","breeze","puddle","calm","forecast"]
  },
  {
    target: "humidity",
    category: "Weather",
    hints: ["It measures how much moisture is in the air.", "High levels can make weather feel sticky.", "It often rises in summer."],
    rankedWords: ["humidity","moisture","air","damp","weather","sticky","summer","climate","sweat","tropical","forecast","level","muggy","condensation","temperature","heat","wet","measure","thermometer","greenhouse","dew","warm","atmosphere","balance","everyday"]
  },
  {
    target: "library",
    category: "School",
    hints: ["It is a quiet place filled with books.", "People borrow books using a card.", "Students often study here."],
    rankedWords: ["library","books","quiet","shelf","study","reading","borrow","librarian","card","research","novel","desk","silence","aisle","catalog","fiction","chapter","reference","room","knowledge","stacks","checkout","archive","everyday","familiar"]
  },
  {
    target: "notebook",
    category: "School",
    hints: ["It has blank or lined pages for writing.", "Students use it to take notes in class.", "It can have a spiral binding."],
    rankedWords: ["notebook","paper","pages","write","notes","school","pen","spiral","cover","journal","binder","study","class","doodle","lines","pencil","backpack","subject","homework","blank","record","jot","sketch","everyday","familiar"]
  },
  {
    target: "classroom",
    category: "School",
    hints: ["It is a room where lessons take place.", "Students sit at desks facing a board.", "A teacher leads lessons here."],
    rankedWords: ["classroom","desk","teacher","student","board","school","lesson","chalk","chair","learning","lecture","textbook","whiteboard","subject","class","education","backpack","attendance","seat","assignment","study","group","recess","quiz","curriculum"]
  },
  {
    target: "homework",
    category: "School",
    hints: ["It is schoolwork done outside of class.", "Students complete it at home in the evening.", "Teachers assign it to reinforce lessons."],
    rankedWords: ["homework","assignment","study","school","textbook","deadline","teacher","exercise","practice","notebook","evening","project","essay","math","reading","due","grade","effort","desk","review","subject","task","complete","struggle","learning"]
  },
  {
    target: "stapler",
    category: "Office",
    hints: ["It fastens sheets of paper together.", "It uses small metal pins.", "You press it down to bind pages."],
    rankedWords: ["stapler","staples","paper","office","desk","fasten","clip","binder","press","metal","pages","supplies","clamp","cabinet","tool","organize","report","document","stack","bind","hole","punch","everyday","familiar","common"]
  },
  {
    target: "meeting",
    category: "Office",
    hints: ["It is a gathering to discuss work topics.", "People sit around a table with an agenda.", "It can be held in person or online."],
    rankedWords: ["meeting","agenda","team","discuss","conference","office","schedule","boardroom","presentation","minutes","colleague","project","call","zoom","notes","decision","update","attendee","room","planning","brainstorm","deadline","report","collaborate","talk"]
  },
  {
    target: "spreadsheet",
    category: "Office",
    hints: ["It organizes data into rows and columns.", "It is used to calculate totals and budgets.", "Excel is a common program for it."],
    rankedWords: ["spreadsheet","excel","rows","columns","cell","data","formula","budget","chart","office","calculate","table","sum","report","numbers","workbook","sheet","analysis","total","filter","graph","finance","tab","input","organize"]
  },
  {
    target: "cubicle",
    category: "Office",
    hints: ["It is a small partitioned workspace in an office.", "Employees sit inside it to work quietly.", "It has walls but no ceiling."],
    rankedWords: ["cubicle","office","desk","workspace","partition","wall","chair","employee","corporate","computer","quiet","space","job","routine","gray","panel","coworker","phone","folder","monitor","workstation","confined","business","organize","everyday"]
  },
  {
    target: "hospital",
    category: "Health",
    hints: ["It is a building where sick people are treated.", "Doctors and nurses work here.", "Emergency rooms are part of it."],
    rankedWords: ["hospital","doctor","nurse","patient","emergency","medicine","ward","clinic","surgery","ambulance","bed","treatment","health","stretcher","waiting","room","care","staff","recovery","checkup","x-ray","icu","appointment","medical","facility"]
  },
  {
    target: "medicine",
    category: "Health",
    hints: ["It treats illness or relieves pain.", "A doctor may prescribe it.", "It can come as pills or liquid."],
    rankedWords: ["medicine","pill","doctor","prescription","dose","treatment","health","pharmacy","tablet","medication","cure","illness","syrup","capsule","remedy","therapy","dosage","clinic","symptom","relief","bottle","chemist","injection","care","recovery"]
  },
  {
    target: "vaccine",
    category: "Health",
    hints: ["It helps the body build immunity to a disease.", "It is usually given as an injection.", "It can prevent serious illness."],
    rankedWords: ["vaccine","injection","immunity","disease","shot","health","prevention","dose","needle","clinic","doctor","protection","virus","booster","syringe","medicine","antibody","public","safety","research","schedule","arm","outbreak","protect","everyday"]
  },
  {
    target: "therapy",
    category: "Health",
    hints: ["It helps people heal physically or emotionally.", "A trained professional guides the sessions.", "It can involve talking or physical exercises."],
    rankedWords: ["therapy","counselor","session","healing","mental","physical","support","talk","exercise","recovery","wellness","emotional","treatment","patient","health","coping","progress","therapist","calm","guidance","stress","balance","growth","reflection","care"]
  },
  {
    target: "hammer",
    category: "Tools",
    hints: ["It is used to drive nails into wood.", "It has a heavy head and a handle.", "Carpenters rely on it often."],
    rankedWords: ["hammer","nail","tool","wood","strike","handle","build","carpenter","workshop","pound","construction","claw","hardware","hit","toolbox","repair","fix","grip","swing","metal","project","garage","bang","craft","forceful"]
  },
  {
    target: "wrench",
    category: "Tools",
    hints: ["It grips and turns nuts and bolts.", "Mechanics use it to fix machines.", "It comes in different sizes."],
    rankedWords: ["wrench","bolt","nut","tool","tighten","mechanic","grip","turn","toolbox","adjustable","socket","repair","garage","metal","fix","loosen","engine","hardware","spanner","workshop","pipe","handle","steel","project","everyday"]
  },
  {
    target: "screwdriver",
    category: "Tools",
    hints: ["It turns screws into or out of surfaces.", "It has a flat or cross-shaped tip.", "It is a common household tool."],
    rankedWords: ["screwdriver","screw","tool","turn","handle","flathead","phillips","toolbox","tighten","loosen","repair","hardware","fix","drill","workshop","project","grip","metal","garage","assemble","diy","kit","household","twist","point"]
  },
  {
    target: "ladder",
    category: "Tools",
    hints: ["It helps you reach high places.", "It has rungs to climb up.", "Painters and workers use it often."],
    rankedWords: ["ladder","climb","rungs","height","reach","step","tall","tool","balance","workman","attic","paint","safety","fold","aluminum","rest","garage","construction","up","stable","extend","platform","risk","everyday","familiar"]
  },
  {
    target: "jacket",
    category: "Clothing",
    hints: ["It is worn over other clothes for warmth.", "It often has sleeves and a zipper.", "It is common in fall and winter."],
    rankedWords: ["jacket","coat","zipper","sleeve","warm","winter","clothing","hood","pocket","fabric","wear","outerwear","fall","layer","closet","fashion","button","fleece","leather","cozy","style","waterproof","collar","fit","shell"]
  },
  {
    target: "shoes",
    category: "Clothing",
    hints: ["They are worn on your feet.", "They come in pairs and many styles.", "Sneakers are a common type of them."],
    rankedWords: ["shoes","sneakers","feet","laces","sole","footwear","pair","boots","walk","closet","brand","comfort","size","sandals","heel","fashion","sport","leather","style","fit","tie","step","wear","shop","athletic"]
  },
  {
    target: "necklace",
    category: "Clothing",
    hints: ["It is jewelry worn around the neck.", "It can have a pendant or beads.", "It is often given as a gift."],
    rankedWords: ["necklace","jewelry","pendant","chain","beads","neck","gift","gold","silver","accessory","clasp","gem","fashion","wear","sparkle","charm","string","elegant","box","shine","design","strand","piece","everyday","familiar"]
  },
  {
    target: "scarf",
    category: "Clothing",
    hints: ["It is worn around the neck for warmth or style.", "It can be knitted or made of silk.", "People wear it in cold weather."],
    rankedWords: ["scarf","wrap","neck","warm","knit","fabric","winter","wool","fashion","cozy","style","silk","accessory","wear","drape","pattern","soft","loop","closet","layer","cold","tie","texture","colorful","comfort"]
  },
  {
    target: "mall",
    category: "Shopping",
    hints: ["It is a large building with many stores.", "People walk from shop to shop inside it.", "It often has a food court."],
    rankedWords: ["mall","shopping","store","shops","escalator","foodcourt","brand","retail","crowd","aisle","bag","sale","outlet","parking","center","browse","cart","checkout","fashion","entertainment","directory","kiosk","cinema","level","weekend"]
  },
  {
    target: "cart",
    category: "Shopping",
    hints: ["You push it while shopping in a store.", "It has wheels and holds your items.", "You unload it at checkout."],
    rankedWords: ["cart","wheels","shopping","push","basket","aisle","store","groceries","checkout","load","handle","supermarket","items","trolley","metal","stack","bag","line","fill","roll","market","child","seat","goods","errand"]
  },
  {
    target: "receipt",
    category: "Shopping",
    hints: ["It is a paper proof of purchase.", "It lists items and their prices.", "You may need it to return an item."],
    rankedWords: ["receipt","purchase","paper","price","total","store","proof","transaction","cashier","bag","return","itemized","tax","register","print","record","checkout","slip","payment","summary","exchange","invoice","copy","everyday","familiar"]
  },
  {
    target: "discount",
    category: "Shopping",
    hints: ["It is a reduction in the price of an item.", "Stores often offer it during sales.", "Coupons can help you get one."],
    rankedWords: ["discount","sale","price","coupon","offer","save","percent","promo","deal","markdown","clearance","reduced","bargain","cheaper","voucher","shopping","special","limited","checkout","code","rebate","promotion","budget","savings","value"]
  },
  {
    target: "happiness",
    category: "Emotions",
    hints: ["It is a feeling of joy and contentment.", "Smiling often shows this emotion.", "People seek it in daily life."],
    rankedWords: ["happiness","joy","smile","content","cheerful","positive","laughter","delight","glad","bliss","gratitude","warmth","optimism","pleasure","satisfaction","sunshine","lighthearted","hopeful","peace","fulfillment","glee","excited","bright","wellbeing","enjoy"]
  },
  {
    target: "sadness",
    category: "Emotions",
    hints: ["It is a feeling of sorrow or unhappiness.", "Tears can be a sign of this emotion.", "People may feel it after a loss."],
    rankedWords: ["sadness","sorrow","tears","cry","grief","down","gloomy","upset","heartache","blue","melancholy","loss","lonely","hurt","disappointment","frown","despair","empty","longing","ache","withdrawn","quiet","reflect","comfort","support"]
  },
  {
    target: "anger",
    category: "Emotions",
    hints: ["It is a strong feeling of displeasure.", "People may raise their voice when feeling it.", "It can be triggered by frustration."],
    rankedWords: ["anger","frustration","mad","rage","upset","annoyed","furious","temper","irritated","yell","fume","clench","heated","resentment","outburst","tense","provoke","argument","calm","cool","control","boil","snap","fury","grudge"]
  },
  {
    target: "surprise",
    category: "Emotions",
    hints: ["It is a reaction to something unexpected.", "Your eyes may widen when you feel it.", "Parties often include this feeling for the guest."],
    rankedWords: ["surprise","shock","unexpected","gasp","startled","astonish","wow","reaction","widen","gift","party","reveal","stun","amazed","sudden","jaw-drop","wonder","twist","event","excitement","unforeseen","jolt","everyday","familiar","common"]
  },
  {
    target: "painting",
    category: "Hobbies",
    hints: ["It involves applying color to a canvas.", "Artists use brushes to create it.", "It can show landscapes, people, or abstract shapes."],
    rankedWords: ["painting","brush","canvas","color","art","paint","artist","palette","easel","gallery","stroke","acrylic","watercolor","oil","sketch","creative","frame","studio","hobby","masterpiece","design","texture","paintbrush","hue","exhibit"]
  },
  {
    target: "fishing",
    category: "Hobbies",
    hints: ["It involves catching fish from water.", "A rod and reel are common tools.", "People enjoy it at lakes or the ocean."],
    rankedWords: ["fishing","rod","reel","bait","hook","lake","river","catch","fish","boat","tackle","cast","water","angler","net","calm","patience","dock","hobby","stream","lure","outdoors","relax","sunrise","gear"]
  },
  {
    target: "camping",
    category: "Hobbies",
    hints: ["It involves sleeping outdoors in nature.", "A tent is often used for shelter.", "A campfire is a common part of it."],
    rankedWords: ["camping","tent","campfire","outdoors","sleepingbag","nature","forest","hiking","marshmallow","lantern","wilderness","backpack","trail","stars","cooler","adventure","cabin","woods","trip","gear","fresh air","site","cookout","explore","weekend"]
  },
  {
    target: "knitting",
    category: "Hobbies",
    hints: ["It uses needles and yarn to make fabric.", "Sweaters and scarves are common results.", "It is a relaxing, repetitive craft."],
    rankedWords: ["knitting","yarn","needle","stitch","wool","sweater","craft","pattern","loop","handmade","scarf","cozy","hobby","thread","weave","cardigan","skein","relaxing","project","texture","warm","creative","spool","design","practice"]
  },

];
