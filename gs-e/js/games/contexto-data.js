// contexto-data.js — Static offline word clusters for Contexto (Phase 3: full 100-cluster dataset)
// No network calls, no embeddings — closeness is simulated via curated rankedWords order.
// target MUST always equal rankedWords[0]. All words lowercase. No duplicate targets.
// Clusters 1-20: original Phase 1 starter set. Clusters 21-100: Phase 2 expansion.

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
    rankedWords: ["dolphin","ocean","fin","mammal","pod","sea","whale","splash","intelligent","echo","click","aquarium","jump","blowhole","marine","swim","trainer","flipper","blue","tail","water","playful"]
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
    rankedWords: ["penguin","ice","antarctica","waddle","flightless","cold","egg","colony","snow","feather","fish","swim","chick","arctic","black","white","tuxedo","zoo","glacier","huddle","ocean","wing"]
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
    rankedWords: ["shark","teeth","ocean","fin","predator","jaws","bite","sea","fish","attack","water","blue","great","reef","hunter","danger","gill","tank","aquarium","deep","fear","swim"]
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
  }

];
