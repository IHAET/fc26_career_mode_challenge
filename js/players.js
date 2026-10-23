/*
 * Known real players, used to tell real signings from regens (players the
 * game generates). Two sources: every player in the squad lists (squads.js,
 * from Wikidata, with club and date of birth), plus this hand-written list of
 * well-known players (names, nationalities, main positions; no ratings).
 * Anyone missing is treated as a possible regen, and the player can override
 * that (the app then remembers the name as real).
 *
 * One player per line: Name|Nationality|Position|alias;alias
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const LIST = `
Bukayo Saka|English|RW
Declan Rice|English|CM
Jude Bellingham|English|CAM
Harry Kane|English|ST
Phil Foden|English|CAM
Cole Palmer|English|CAM
Trent Alexander-Arnold|English|RB|Trent
John Stones|English|CB
Marc Guéhi|English|CB
Jordan Pickford|English|GK
Kyle Walker|English|RB
Reece James|English|RB
Levi Colwill|English|CB
Ollie Watkins|English|ST
Anthony Gordon|English|LW
Eberechi Eze|English|CAM
Morgan Rogers|English|CAM
Kobbie Mainoo|English|CM
Jarrod Bowen|English|RW
Conor Gallagher|English|CM
Ezri Konsa|English|CB
Dean Henderson|English|GK
Aaron Ramsdale|English|GK
James Trafford|English|GK
Jordan Henderson|English|CM
Jack Grealish|English|LW
Marcus Rashford|English|LW
Mason Mount|English|CAM
Luke Shaw|English|LB
Harry Maguire|English|CB
Elliot Anderson|English|CM
Adam Wharton|English|CM
Curtis Jones|English|CM
Jarell Quansah|English|CB
Noni Madueke|English|RW
Jadon Sancho|English|RW
Dominic Solanke|English|ST
Ivan Toney|English|ST
Dominic Calvert-Lewin|English|ST
Jamie Gittens|English|LW|Jamie Bynoe-Gittens
Myles Lewis-Skelly|English|LB
Ethan Nwaneri|English|CAM
Rico Lewis|English|RB
Tino Livramento|English|RB
Dan Burn|English|CB
Ben White|English|RB
Callum Hudson-Odoi|English|LW
Jobe Bellingham|English|CM
Morgan Gibbs-White|English|CAM
James Maddison|English|CAM
Jarrad Branthwaite|English|CB
Liam Delap|English|ST
Raheem Sterling|English|LW
Kieran Trippier|English|RB
Lewis Hall|English|LB
Tyrick Mitchell|English|LB
Djed Spence|English|RB
Fikayo Tomori|English|CB
Eddie Nketiah|English|ST
Emile Smith Rowe|English|CAM
Kalvin Phillips|English|CDM
Ben Chilwell|English|LB
Joe Gomez|English|CB
Nick Pope|English|GK
Sam Johnstone|English|GK
Tammy Abraham|English|ST
Chris Wood|New Zealander|ST
Kylian Mbappé|French|ST|Mbappe
Ousmane Dembélé|French|RW
Antoine Griezmann|French|ST
William Saliba|French|CB
Aurélien Tchouaméni|French|CDM
Eduardo Camavinga|French|CM
Mike Maignan|French|GK
Theo Hernández|French|LB
Jules Koundé|French|RB
Dayot Upamecano|French|CB
Ibrahima Konaté|French|CB
Michael Olise|French|RW
Bradley Barcola|French|LW
Désiré Doué|French|RW
Warren Zaïre-Emery|French|CM
Marcus Thuram|French|ST
Randal Kolo Muani|French|ST
Kingsley Coman|French|LW
Adrien Rabiot|French|CM
N'Golo Kanté|French|CDM|Kante
Rayan Cherki|French|CAM
Manu Koné|French|CM
Youssouf Fofana|French|CDM
Lucas Hernández|French|CB
Benjamin Pavard|French|CB
Wesley Fofana|French|CB
Malo Gusto|French|RB
Lucas Chevalier|French|GK
Hugo Ekitiké|French|ST
Mathys Tel|French|ST
Jean-Philippe Mateta|French|ST
Olivier Giroud|French|ST
Christopher Nkunku|French|CAM
Lucas Digne|French|LB
Leny Yoro|French|CB
Castello Lukeba|French|CB
Karim Benzema|French|ST
Paul Pogba|French|CM
Moussa Diaby|French|RW
Michael Kayode|Italian|RB
Lamine Yamal|Spanish|RW|Yamal
Pedri|Spanish|CM
Gavi|Spanish|CM
Rodri|Spanish|CDM
Dani Olmo|Spanish|CAM
Nico Williams|Spanish|LW
Mikel Oyarzabal|Spanish|ST
Fabián Ruiz|Spanish|CM
Martín Zubimendi|Spanish|CDM
Mikel Merino|Spanish|CM
Álvaro Morata|Spanish|ST
Unai Simón|Spanish|GK
David Raya|Spanish|GK
Pau Cubarsí|Spanish|CB
Robin Le Normand|Spanish|CB
Aymeric Laporte|Spanish|CB
Dani Carvajal|Spanish|RB
Marc Cucurella|Spanish|LB
Pedro Porro|Spanish|RB
Alejandro Grimaldo|Spanish|LB
Álex Baena|Spanish|CAM
Ferran Torres|Spanish|ST
Fermín López|Spanish|CAM
Dean Huijsen|Spanish|CB
Álvaro Carreras|Spanish|LB
Joan García|Spanish|GK
Marc Casadó|Spanish|CDM
Alejandro Balde|Spanish|LB
Marcos Llorente|Spanish|CM
Koke|Spanish|CM
Isco|Spanish|CAM
Iago Aspas|Spanish|ST
Ansu Fati|Spanish|LW
Yeremy Pino|Spanish|RW
Samu Aghehowa|Spanish|ST|Samu Omorodion
Nico González|Spanish|CDM
Dani Vivian|Spanish|CB
Oihan Sancet|Spanish|CAM
Raúl Asencio|Spanish|CB
Sergio Ramos|Spanish|CB
Jesús Vallejo|Spanish|CB
Florian Wirtz|German|CAM
Jamal Musiala|German|CAM
Joshua Kimmich|German|CDM
Kai Havertz|German|ST
Leroy Sané|German|RW
Antonio Rüdiger|German|CB
Jonathan Tah|German|CB
Nico Schlotterbeck|German|CB
Marc-André ter Stegen|German|GK|ter Stegen
Manuel Neuer|German|GK
Leon Goretzka|German|CM
Serge Gnabry|German|RW
Niclas Füllkrug|German|ST
Deniz Undav|German|ST
Nick Woltemade|German|ST
Karim Adeyemi|German|RW
Aleksandar Pavlović|German|CDM
Robert Andrich|German|CDM
David Raum|German|LB
Maximilian Mittelstädt|German|LB
Pascal Groß|German|CM
Chris Führich|German|LW
Angelo Stiller|German|CM
Tim Kleindienst|German|ST
Felix Nmecha|German|CM
Thomas Müller|German|CAM
İlkay Gündoğan|German|CM|Gundogan
Lennart Karl|German|RW
Maximilian Beier|German|ST
Waldemar Anton|German|CB
Kevin Schade|German|LW
Brajan Gruda|German|CAM
Oliver Baumann|German|GK
Nadiem Amiri|German|CAM
Cristiano Ronaldo|Portuguese|ST|Ronaldo;CR7
Bruno Fernandes|Portuguese|CAM
Bernardo Silva|Portuguese|CAM
Rúben Dias|Portuguese|CB
João Cancelo|Portuguese|RB
Vitinha|Portuguese|CM
João Neves|Portuguese|CM
Rafael Leão|Portuguese|LW
Diogo Costa|Portuguese|GK
Nuno Mendes|Portuguese|LB
Gonçalo Ramos|Portuguese|ST
João Félix|Portuguese|CAM
Pedro Neto|Portuguese|RW
Gonçalo Inácio|Portuguese|CB
Francisco Conceição|Portuguese|RW
Diogo Dalot|Portuguese|RB
Rúben Neves|Portuguese|CDM
João Palhinha|Portuguese|CDM
Matheus Nunes|Portuguese|CM
Francisco Trincão|Portuguese|RW|Trincão
Pedro Gonçalves|Portuguese|CAM|Pote
Renato Veiga|Portuguese|CB
Rodrigo Mora|Portuguese|CAM
Geovany Quenda|Portuguese|RW
Nélson Semedo|Portuguese|RB
António Silva|Portuguese|CB
Tomás Araújo|Portuguese|CB
Samu Costa|Portuguese|CDM
Gianluigi Donnarumma|Italian|GK
Nicolò Barella|Italian|CM
Alessandro Bastoni|Italian|CB
Federico Dimarco|Italian|LB
Sandro Tonali|Italian|CM
Riccardo Calafiori|Italian|CB
Federico Chiesa|Italian|RW
Mateo Retegui|Italian|ST
Moise Kean|Italian|ST
Giacomo Raspadori|Italian|ST
Davide Frattesi|Italian|CM
Lorenzo Pellegrini|Italian|CAM
Giovanni Di Lorenzo|Italian|RB
Alessandro Buongiorno|Italian|CB
Guglielmo Vicario|Italian|GK
Manuel Locatelli|Italian|CDM
Samuele Ricci|Italian|CDM
Andrea Cambiaso|Italian|LB
Destiny Udogie|Italian|LB
Federico Gatti|Italian|CB
Matteo Politano|Italian|RW
Gianluca Scamacca|Italian|ST
Ciro Immobile|Italian|ST
Lorenzo Insigne|Italian|LW
Nicolò Fagioli|Italian|CM
Francesco Pio Esposito|Italian|ST
Marco Verratti|Italian|CM
Mattia Zaccagni|Italian|LW
Bryan Cristante|Italian|CDM
Giorgio Scalvini|Italian|CB
Matteo Darmian|Italian|RB
Alex Meret|Italian|GK
Virgil van Dijk|Dutch|CB
Frenkie de Jong|Dutch|CM
Cody Gakpo|Dutch|LW
Xavi Simons|Dutch|CAM
Ryan Gravenberch|Dutch|CDM
Tijjani Reijnders|Dutch|CM
Denzel Dumfries|Dutch|RB
Micky van de Ven|Dutch|CB
Matthijs de Ligt|Dutch|CB
Nathan Aké|Dutch|CB
Stefan de Vrij|Dutch|CB
Jurriën Timber|Dutch|RB
Memphis Depay|Dutch|ST|Memphis
Donyell Malen|Dutch|RW
Brian Brobbey|Dutch|ST
Wout Weghorst|Dutch|ST
Teun Koopmeiners|Dutch|CM
Jeremie Frimpong|Dutch|RB
Bart Verbruggen|Dutch|GK
Jan Paul van Hecke|Dutch|CB
Joshua Zirkzee|Dutch|ST
Quinten Timber|Dutch|CM
Justin Kluivert|Dutch|LW
Jorrel Hato|Dutch|LB
Ian Maatsen|Dutch|LB
Steven Bergwijn|Dutch|LW
Noa Lang|Dutch|LW
Mats Wieffer|Dutch|CDM
Lutsharel Geertruida|Dutch|RB
Crysencio Summerville|Dutch|LW
Kevin De Bruyne|Belgian|CAM|KDB
Thibaut Courtois|Belgian|GK
Romelu Lukaku|Belgian|ST
Jérémy Doku|Belgian|LW
Leandro Trossard|Belgian|LW
Youri Tielemans|Belgian|CM
Amadou Onana|Belgian|CDM
Charles De Ketelaere|Belgian|CAM
Loïs Openda|Belgian|ST
Timothy Castagne|Belgian|RB
Arthur Theate|Belgian|CB
Zeno Debast|Belgian|CB
Johan Bakayoko|Belgian|RW
Axel Witsel|Belgian|CDM
Yannick Carrasco|Belgian|LW
Dodi Lukébakio|Belgian|RW
Maxim De Cuyper|Belgian|LB
Arthur Vermeeren|Belgian|CM
Malick Fofana|Belgian|LW
Vinícius Júnior|Brazilian|LW|Vinicius Jr;Vini Jr;Vinicius
Rodrygo|Brazilian|RW
Raphinha|Brazilian|LW
Alisson|Brazilian|GK|Alisson Becker
Ederson|Brazilian|GK|Ederson Moraes
Marquinhos|Brazilian|CB
Gabriel Magalhães|Brazilian|CB
Éder Militão|Brazilian|CB
Bruno Guimarães|Brazilian|CM
Casemiro|Brazilian|CDM
Lucas Paquetá|Brazilian|CAM
Endrick|Brazilian|ST
Estêvão|Brazilian|RW|Estevao Willian
Gabriel Martinelli|Brazilian|LW
Richarlison|Brazilian|ST
Neymar|Brazilian|LW|Neymar Jr
Antony|Brazilian|RW
Matheus Cunha|Brazilian|ST
João Pedro|Brazilian|ST
Savinho|Brazilian|RW|Sávio
Gabriel Jesus|Brazilian|ST
Danilo|Brazilian|RB
Gleison Bremer|Brazilian|CB|Bremer
Douglas Luiz|Brazilian|CM
André|Brazilian|CDM
Joelinton|Brazilian|CM
Igor Thiago|Brazilian|ST
Vitor Roque|Brazilian|ST
Wesley|Brazilian|RB|Wesley França
Lucas Beraldo|Brazilian|CB
Andreas Pereira|Brazilian|CM
Thiago Silva|Brazilian|CB
Philippe Coutinho|Brazilian|CAM
Roberto Firmino|Brazilian|ST
Malcom|Brazilian|RW
Evanilson|Brazilian|ST
Murillo|Brazilian|CB
Luiz Henrique|Brazilian|RW
Lionel Messi|Argentine|RW|Messi;Leo Messi
Julián Álvarez|Argentine|ST
Lautaro Martínez|Argentine|ST
Emiliano Martínez|Argentine|GK|Dibu Martinez
Enzo Fernández|Argentine|CM
Alexis Mac Allister|Argentine|CM
Rodrigo De Paul|Argentine|CM
Cristian Romero|Argentine|CB|Cuti Romero
Lisandro Martínez|Argentine|CB
Nicolás Otamendi|Argentine|CB
Nahuel Molina|Argentine|RB
Nicolás Tagliafico|Argentine|LB
Leandro Paredes|Argentine|CDM
Giovani Lo Celso|Argentine|CAM
Ángel Di María|Argentine|RW
Paulo Dybala|Argentine|CAM
Alejandro Garnacho|Argentine|LW
Nico Paz|Argentine|CAM
Franco Mastantuono|Argentine|RW
Thiago Almada|Argentine|CAM
Valentín Carboni|Argentine|CAM
Nicolás González|Argentine|LW
Exequiel Palacios|Argentine|CM
Gonzalo Montiel|Argentine|RB
Valentín Castellanos|Argentine|ST
Claudio Echeverri|Argentine|CAM
Leonardo Balerdi|Argentine|CB
Facundo Buonanotte|Argentine|CAM
Giuliano Simeone|Argentine|RW
Matías Soulé|Argentine|RW
Ángel Correa|Argentine|ST
Gerónimo Rulli|Argentine|GK
Marcos Acuña|Argentine|LB
Guido Rodríguez|Argentine|CDM
Santiago Castro|Argentine|ST
Federico Valverde|Uruguayan|CM
Darwin Núñez|Uruguayan|ST
Ronald Araújo|Uruguayan|CB
José María Giménez|Uruguayan|CB
Rodrigo Bentancur|Uruguayan|CM
Manuel Ugarte|Uruguayan|CDM
Luis Suárez|Uruguayan|ST
Facundo Pellistri|Uruguayan|RW
Mathías Olivera|Uruguayan|LB
Sergio Rochet|Uruguayan|GK
Giorgian de Arrascaeta|Uruguayan|CAM
Maximiliano Araújo|Uruguayan|LW
Nicolás de la Cruz|Uruguayan|CAM
Luis Díaz|Colombian|LW
James Rodríguez|Colombian|CAM
Jhon Durán|Colombian|ST
Daniel Muñoz|Colombian|RB
Jhon Arias|Colombian|RW
Richard Ríos|Colombian|CM
Davinson Sánchez|Colombian|CB
Jefferson Lerma|Colombian|CDM
Luis Sinisterra|Colombian|LW
Jhon Lucumí|Colombian|CB
Yerson Mosquera|Colombian|CB
Rafael Santos Borré|Colombian|ST
Juan Cuadrado|Colombian|RB
Yerry Mina|Colombian|CB
Camilo Vargas|Colombian|GK
Moisés Caicedo|Ecuadorian|CDM
Piero Hincapié|Ecuadorian|CB
Pervis Estupiñán|Ecuadorian|LB
Willian Pacho|Ecuadorian|CB
Kendry Páez|Ecuadorian|CAM
Enner Valencia|Ecuadorian|ST
Gonzalo Plata|Ecuadorian|RW
Kevin Rodríguez|Ecuadorian|ST
Alexis Sánchez|Chilean|ST
Arturo Vidal|Chilean|CM
Miguel Almirón|Paraguayan|RW
Julio Enciso|Paraguayan|CAM
Diego Gómez|Paraguayan|CM
Omar Alderete|Paraguayan|CB
Salomón Rondón|Venezuelan|ST
Yeferson Soteldo|Venezuelan|LW
Luka Modrić|Croatian|CM
Joško Gvardiol|Croatian|CB
Mateo Kovačić|Croatian|CM
Marcelo Brozović|Croatian|CDM
Ivan Perišić|Croatian|LW
Andrej Kramarić|Croatian|ST
Mario Pašalić|Croatian|CM
Luka Sučić|Croatian|CM
Josip Stanišić|Croatian|RB
Dominik Livaković|Croatian|GK
Petar Sučić|Croatian|CM
Martin Baturina|Croatian|CAM
Josip Šutalo|Croatian|CB
Lovro Majer|Croatian|CAM
Ante Budimir|Croatian|ST
Luka Vušković|Croatian|CB
Dušan Vlahović|Serbian|ST
Aleksandar Mitrović|Serbian|ST
Sergej Milinković-Savić|Serbian|CM
Dušan Tadić|Serbian|CAM
Filip Kostić|Serbian|LW
Strahinja Pavlović|Serbian|CB
Nikola Milenković|Serbian|CB
Vanja Milinković-Savić|Serbian|GK
Lazar Samardžić|Serbian|CAM
Ivan Ilić|Serbian|CM
Christian Eriksen|Danish|CM
Rasmus Højlund|Danish|ST
Pierre-Emile Højbjerg|Danish|CDM
Kasper Schmeichel|Danish|GK
Andreas Christensen|Danish|CB
Joachim Andersen|Danish|CB
Morten Hjulmand|Danish|CDM
Mikkel Damsgaard|Danish|CAM
Victor Kristiansen|Danish|LB
Patrick Dorgu|Danish|LB
Jonas Wind|Danish|ST
Gustav Isaksen|Danish|RW
Kasper Dolberg|Danish|ST
Morten Frendrup|Danish|CM
Mika Biereth|Danish|ST
Conrad Harder|Danish|ST
Joakim Mæhle|Danish|RB
Jannik Vestergaard|Danish|CB
Albert Grønbæk|Danish|CAM
Kasper Høgh|Danish|ST
Erling Haaland|Norwegian|ST|Haaland
Martin Ødegaard|Norwegian|CAM
Alexander Sørloth|Norwegian|ST
Antonio Nusa|Norwegian|LW
Oscar Bobb|Norwegian|RW
Sander Berge|Norwegian|CDM
Kristoffer Ajer|Norwegian|CB
Leo Østigård|Norwegian|CB
Ørjan Nyland|Norwegian|GK
Jørgen Strand Larsen|Norwegian|ST
Patrick Berg|Norwegian|CDM
Kristian Thorstvedt|Norwegian|CM
Andreas Schjelderup|Norwegian|LW
Julian Ryerson|Norwegian|RB
Jens Petter Hauge|Norwegian|LW
Fredrik Aursnes|Norwegian|CM
Morten Thorsby|Norwegian|CM
David Møller Wolfe|Norwegian|LB
Alexander Isak|Swedish|ST
Viktor Gyökeres|Swedish|ST
Dejan Kulusevski|Swedish|RW
Victor Lindelöf|Swedish|CB
Emil Forsberg|Swedish|CAM
Isak Hien|Swedish|CB
Lucas Bergvall|Swedish|CM
Yasin Ayari|Swedish|CM
Anthony Elanga|Swedish|RW
Hugo Larsson|Swedish|CM
Jens Cajuste|Swedish|CM
Robin Olsen|Swedish|GK
Roony Bardghji|Swedish|RW
Gabriel Gudmundsson|Swedish|LB
Mattias Svanberg|Swedish|CM
Benjamin Nygren|Swedish|CAM
David Alaba|Austrian|CB
Marcel Sabitzer|Austrian|CM
Konrad Laimer|Austrian|CM
Christoph Baumgartner|Austrian|CAM
Marko Arnautović|Austrian|ST
Kevin Danso|Austrian|CB
Nicolas Seiwald|Austrian|CDM
Xaver Schlager|Austrian|CM
Philipp Lienhart|Austrian|CB
Michael Gregoritsch|Austrian|ST
Patrick Wimmer|Austrian|RW
Romano Schmid|Austrian|CAM
Phillipp Mwene|Austrian|LB
Stefan Posch|Austrian|RB
Maximilian Wöber|Austrian|CB
Granit Xhaka|Swiss|CM
Manuel Akanji|Swiss|CB
Yann Sommer|Swiss|GK
Gregor Kobel|Swiss|GK
Breel Embolo|Swiss|ST
Dan Ndoye|Swiss|RW
Remo Freuler|Swiss|CM
Ricardo Rodríguez|Swiss|LB
Nico Elvedi|Swiss|CB
Denis Zakaria|Swiss|CDM
Ruben Vargas|Swiss|LW
Johan Manzambi|Swiss|CM
Fabian Rieder|Swiss|CAM
Zeki Amdouni|Swiss|ST
Xherdan Shaqiri|Swiss|CAM
Robert Lewandowski|Polish|ST|Lewandowski
Wojciech Szczęsny|Polish|GK
Piotr Zieliński|Polish|CM
Jakub Kiwior|Polish|CB
Nicola Zalewski|Polish|LB
Sebastian Szymański|Polish|CAM
Jan Bednarek|Polish|CB
Krzysztof Piątek|Polish|ST
Jakub Moder|Polish|CM
Matty Cash|Polish|RB
Łukasz Skorupski|Polish|GK
Kacper Urbański|Polish|CAM
Jakub Kamiński|Polish|LW
Karol Świderski|Polish|ST
Patrik Schick|Czech|ST
Tomáš Souček|Czech|CDM
Vladimír Coufal|Czech|RB
Adam Hložek|Czech|ST
Ladislav Krejčí|Czech|CB
Milan Škriniar|Slovak|CB
Stanislav Lobotka|Slovak|CDM
Dávid Hancko|Slovak|CB
Martin Dúbravka|Slovak|GK
Dominik Szoboszlai|Hungarian|CAM
Milos Kerkez|Hungarian|LB
Roland Sallai|Hungarian|RW
Willi Orbán|Hungarian|CB
Barnabás Varga|Hungarian|ST
Péter Gulácsi|Hungarian|GK
András Schäfer|Hungarian|CM
Mykhailo Mudryk|Ukrainian|LW
Oleksandr Zinchenko|Ukrainian|LB
Artem Dovbyk|Ukrainian|ST
Illia Zabarnyi|Ukrainian|CB
Georgiy Sudakov|Ukrainian|CAM
Anatoliy Trubin|Ukrainian|GK
Andriy Lunin|Ukrainian|GK
Viktor Tsygankov|Ukrainian|RW
Vitaliy Mykolenko|Ukrainian|LB
Khvicha Kvaratskhelia|Georgian|LW|Kvara
Giorgi Mamardashvili|Georgian|GK
Georges Mikautadze|Georgian|ST
Arda Güler|Turkish|CAM
Hakan Çalhanoğlu|Turkish|CDM
Kenan Yıldız|Turkish|LW
Ferdi Kadıoğlu|Turkish|LB
Kerem Aktürkoğlu|Turkish|LW
Orkun Kökçü|Turkish|CM
Merih Demiral|Turkish|CB
Barış Alper Yılmaz|Turkish|LW
Uğurcan Çakır|Turkish|GK
Abdülkerim Bardakcı|Turkish|CB
İsmail Yüksek|Turkish|CDM
Can Uzun|Turkish|CAM
Semih Kılıçsoy|Turkish|ST
Cengiz Ünder|Turkish|RW
Zeki Çelik|Turkish|RB
Andrew Robertson|Scottish|LB|Andy Robertson
Scott McTominay|Scottish|CM
John McGinn|Scottish|CM
Billy Gilmour|Scottish|CM
Kieran Tierney|Scottish|LB
Che Adams|Scottish|ST
Lewis Ferguson|Scottish|CM
Angus Gunn|Scottish|GK
Callum McGregor|Scottish|CM
Lyndon Dykes|Scottish|ST
Ryan Christie|Scottish|CAM
Nathan Patterson|Scottish|RB
Lawrence Shankland|Scottish|ST
Ben Doak|Scottish|RW
Jack Hendry|Scottish|CB
Grant Hanley|Scottish|CB
Brennan Johnson|Welsh|RW
Harry Wilson|Welsh|RW
Ethan Ampadu|Welsh|CDM
Daniel James|Welsh|LW
Kieffer Moore|Welsh|ST
Neco Williams|Welsh|RB
Joe Rodon|Welsh|CB
Ben Davies|Welsh|CB
Aaron Ramsey|Welsh|CM
Danny Ward|Welsh|GK
David Brooks|Welsh|RW
Jordan James|Welsh|CM
Connor Roberts|Welsh|RB
Nathan Broadhead|Welsh|LW
Mark Harris|Welsh|ST
Karl Darlow|Welsh|GK
Chris Mepham|Welsh|CB
Sorba Thomas|Welsh|RW
Rubin Colwill|Welsh|CAM
Wes Burns|Welsh|RW
Liam Cullen|Welsh|ST
Lewis Koumas|Welsh|CAM
Caoimhín Kelleher|Irish|GK
Nathan Collins|Irish|CB
Evan Ferguson|Irish|ST
Matt Doherty|Irish|RB
Seamus Coleman|Irish|RB
Troy Parrott|Irish|ST
Chiedozie Ogbene|Irish|RW
Josh Cullen|Irish|CM
Jayson Molumby|Irish|CM
Mikey Johnston|Irish|LW
Dara O'Shea|Irish|CB
Andrew Omobamidele|Irish|CB
Sammie Szmodics|Irish|CAM
Conor Bradley|Northern Irish|RB
Jonny Evans|Northern Irish|CB
Bailey Peacock-Farrell|Northern Irish|GK
Shea Charles|Northern Irish|CDM
Isaac Price|Northern Irish|CAM
Daniel Ballard|Northern Irish|CB
Trai Hume|Northern Irish|RB
Mohamed Salah|Egyptian|RW|Salah;Mo Salah
Omar Marmoush|Egyptian|ST
Mostafa Mohamed|Egyptian|ST
Achraf Hakimi|Moroccan|RB
Brahim Díaz|Moroccan|CAM
Noussair Mazraoui|Moroccan|RB
Sofyan Amrabat|Moroccan|CDM
Youssef En-Nesyri|Moroccan|ST
Hakim Ziyech|Moroccan|RW
Yassine Bounou|Moroccan|GK|Bono
Nayef Aguerd|Moroccan|CB
Azzedine Ounahi|Moroccan|CM
Bilal El Khannouss|Moroccan|CAM
Eliesse Ben Seghir|Moroccan|CAM
Abde Ezzalzouli|Moroccan|LW
Ismael Saibari|Moroccan|CAM
Amine Adli|Moroccan|LW
Victor Osimhen|Nigerian|ST
Ademola Lookman|Nigerian|LW
Samuel Chukwueze|Nigerian|RW
Alex Iwobi|Nigerian|CM
Wilfred Ndidi|Nigerian|CDM
Victor Boniface|Nigerian|ST
Calvin Bassey|Nigerian|CB
Ola Aina|Nigerian|RB
Taiwo Awoniyi|Nigerian|ST
Kelechi Iheanacho|Nigerian|ST
Moses Simon|Nigerian|LW
Frank Onyeka|Nigerian|CM
Raphael Onyedika|Nigerian|CDM
Tolu Arokodare|Nigerian|ST
Fisayo Dele-Bashiru|Nigerian|CM
Sadio Mané|Senegalese|LW
Kalidou Koulibaly|Senegalese|CB
Nicolas Jackson|Senegalese|ST
Ismaïla Sarr|Senegalese|RW
Idrissa Gueye|Senegalese|CDM
Pape Matar Sarr|Senegalese|CM
Édouard Mendy|Senegalese|GK
Iliman Ndiaye|Senegalese|LW
Lamine Camara|Senegalese|CM
Habib Diarra|Senegalese|CM
Boulaye Dia|Senegalese|ST
Krépin Diatta|Senegalese|RW
Moussa Niakhaté|Senegalese|CB
El Hadji Malick Diouf|Senegalese|LB
Pape Gueye|Senegalese|CM
Mohammed Kudus|Ghanaian|RW
Thomas Partey|Ghanaian|CDM
Antoine Semenyo|Ghanaian|RW
Jordan Ayew|Ghanaian|ST
André Ayew|Ghanaian|RW
Mohammed Salisu|Ghanaian|CB
Tariq Lamptey|Ghanaian|RB
Kamaldeen Sulemana|Ghanaian|LW
Ernest Nuamah|Ghanaian|RW
Abdul Fatawu|Ghanaian|RW
Iñaki Williams|Ghanaian|ST
Ibrahim Osman|Ghanaian|LW
Sébastien Haller|Ivorian|ST
Franck Kessié|Ivorian|CM
Simon Adingra|Ivorian|LW
Amad Diallo|Ivorian|RW|Amad
Evan Ndicka|Ivorian|CB
Odilon Kossounou|Ivorian|CB
Wilfried Zaha|Ivorian|LW
Nicolas Pépé|Ivorian|RW
Seko Fofana|Ivorian|CM
Ibrahim Sangaré|Ivorian|CDM
Oumar Diakité|Ivorian|RW
Jérémie Boga|Ivorian|LW
Yan Diomande|Ivorian|LW
Ousmane Diomande|Ivorian|CB
Wilfried Singo|Ivorian|RB
Ghislain Konan|Ivorian|LB
André Onana|Cameroonian|GK
Bryan Mbeumo|Cameroonian|RW
Vincent Aboubakar|Cameroonian|ST
Frank Anguissa|Cameroonian|CM|André-Frank Zambo Anguissa
Carlos Baleba|Cameroonian|CDM
Eric Maxim Choupo-Moting|Cameroonian|ST
Karl Toko Ekambi|Cameroonian|LW
Christopher Wooh|Cameroonian|CB
Jean-Charles Castelletto|Cameroonian|CB
Nouhou Tolo|Cameroonian|LB
Riyad Mahrez|Algerian|RW
Ismaël Bennacer|Algerian|CDM
Rayan Aït-Nouri|Algerian|LB
Amine Gouiri|Algerian|ST
Houssem Aouar|Algerian|CM
Mohamed Amoura|Algerian|ST
Saïd Benrahma|Algerian|LW
Ramy Bensebaini|Algerian|LB
Aïssa Mandi|Algerian|CB
Ibrahim Maza|Algerian|CAM
Farès Chaïbi|Algerian|CAM
Rafik Belghali|Algerian|RB
Yves Bissouma|Malian|CDM
Amadou Haidara|Malian|CM
Mohamed Camara|Malian|CDM
Kamory Doumbia|Malian|CAM
Lassine Sinayoko|Malian|ST
El Bilal Touré|Malian|ST
Moussa Djenepo|Malian|LW
Serhou Guirassy|Guinean|ST
Naby Keïta|Guinean|CM
Amadou Diawara|Guinean|CDM
Mohamed Bayo|Guinean|ST
Edmond Tapsoba|Burkinabé|CB
Bertrand Traoré|Burkinabé|RW
Dango Ouattara|Burkinabé|LW
Lassina Traoré|Burkinabé|ST
Yoane Wissa|Congolese|ST
Chancel Mbemba|Congolese|CB
Cédric Bakambu|Congolese|ST
Arthur Masuaku|Congolese|LB
Axel Tuanzebe|Congolese|CB
Aaron Wan-Bissaka|Congolese|RB
Noah Sadiki|Congolese|CM
Pierre-Emerick Aubameyang|Gabonese|ST
Mario Lemina|Gabonese|CDM
Denis Bouanga|Gabonese|LW
Ellyes Skhiri|Tunisian|CDM
Hannibal Mejbri|Tunisian|CAM
Montassar Talbi|Tunisian|CB
Patson Daka|Zambian|ST
Lyle Foster|South African|ST
Percy Tau|South African|LW
Yankuba Minteh|Gambian|RW
Logan Costa|Cape Verdean|CB
Marshall Munetsi|Zimbabwean|CM
Jordan Zemura|Zimbabwean|LB
Son Heung-min|South Korean|LW|Son;Heung-min Son
Kim Min-jae|South Korean|CB
Lee Kang-in|South Korean|CAM
Hwang Hee-chan|South Korean|ST
Lee Jae-sung|South Korean|CAM
Hwang In-beom|South Korean|CM
Oh Hyeon-gyu|South Korean|ST
Bae Jun-ho|South Korean|CAM
Takefusa Kubo|Japanese|RW
Kaoru Mitoma|Japanese|LW
Wataru Endo|Japanese|CDM
Takehiro Tomiyasu|Japanese|RB
Daichi Kamada|Japanese|CAM
Ritsu Doan|Japanese|RW
Takumi Minamino|Japanese|CAM
Hiroki Ito|Japanese|CB
Ayase Ueda|Japanese|ST
Kou Itakura|Japanese|CB
Junya Ito|Japanese|RW
Zion Suzuki|Japanese|GK
Ao Tanaka|Japanese|CM
Yukinari Sugawara|Japanese|RB
Keito Nakamura|Japanese|LW
Hidemasa Morita|Japanese|CM
Kyogo Furuhashi|Japanese|ST
Reo Hatate|Japanese|CM
Daizen Maeda|Japanese|LW
Koki Machida|Japanese|CB
Mehdi Taremi|Iranian|ST
Sardar Azmoun|Iranian|ST
Alireza Jahanbakhsh|Iranian|RW
Mathew Ryan|Australian|GK
Jackson Irvine|Australian|CM
Harry Souttar|Australian|CB
Alessandro Circati|Australian|CB
Riley McGree|Australian|CAM
Nestory Irankunda|Australian|RW
Salem Al-Dawsari|Saudi|LW
Firas Al-Buraikan|Saudi|ST
Saud Abdulhamid|Saudi|RB
Eldor Shomurodov|Uzbek|ST
Abdukodir Khusanov|Uzbek|CB
Abbosbek Fayzullaev|Uzbek|CAM
Akram Afif|Qatari|LW
Almoez Ali|Qatari|ST
Wu Lei|Chinese|ST
Christian Pulisic|American|RW
Weston McKennie|American|CM
Tyler Adams|American|CDM
Gio Reyna|American|CAM|Giovanni Reyna
Antonee Robinson|American|LB
Sergiño Dest|American|RB
Folarin Balogun|American|ST
Timothy Weah|American|RW|Tim Weah
Yunus Musah|American|CM
Chris Richards|American|CB
Matt Turner|American|GK
Ricardo Pepi|American|ST
Josh Sargent|American|ST
Malik Tillman|American|CAM
Brenden Aaronson|American|CAM
Johnny Cardoso|American|CDM
Haji Wright|American|ST
Tim Ream|American|CB
Cameron Carter-Vickers|American|CB
Diego Luna|American|CAM
Alphonso Davies|Canadian|LB
Jonathan David|Canadian|ST
Tajon Buchanan|Canadian|RW
Stephen Eustáquio|Canadian|CM
Cyle Larin|Canadian|ST
Ismaël Koné|Canadian|CM
Alistair Johnston|Canadian|RB
Moïse Bombito|Canadian|CB
Jonathan Osorio|Canadian|CM
Derek Cornelius|Canadian|CB
Maxime Crépeau|Canadian|GK
Jacob Shaffelburg|Canadian|LW
Promise David|Canadian|ST
Tani Oluwaseyi|Canadian|ST
Santiago Giménez|Mexican|ST
Raúl Jiménez|Mexican|ST
Edson Álvarez|Mexican|CDM
Hirving Lozano|Mexican|RW|Chucky Lozano
Guillermo Ochoa|Mexican|GK|Memo Ochoa
César Montes|Mexican|CB
Johan Vásquez|Mexican|CB
Orbelín Pineda|Mexican|CAM
Luis Chávez|Mexican|CM
Julián Quiñones|Mexican|ST
Henry Martín|Mexican|ST
Jorge Sánchez|Mexican|RB
Alexis Vega|Mexican|LW
Raúl Rangel|Mexican|GK
Gilberto Mora|Mexican|CAM
Obed Vargas|Mexican|CM
Keylor Navas|Costa Rican|GK
Manfred Ugalde|Costa Rican|ST
Michail Antonio|Jamaican|ST
Leon Bailey|Jamaican|RW
Demarai Gray|Jamaican|LW
Bobby Decordova-Reid|Jamaican|RW|Bobby De Cordova-Reid
Ethan Pinnock|Jamaican|CB
Adalberto Carrasquilla|Panamanian|CM
Michael Murillo|Panamanian|RB
Ismael Díaz|Panamanian|ST
Albert Guðmundsson|Icelandic|CAM|Albert Gudmundsson
Hákon Arnar Haraldsson|Icelandic|CAM
Orri Óskarsson|Icelandic|ST
Teemu Pukki|Finnish|ST
Lukáš Hrádecký|Finnish|GK
Glen Kamara|Finnish|CM
Konstantinos Tsimikas|Greek|LB
Vangelis Pavlidis|Greek|ST
Konstantinos Mavropanos|Greek|CB
Christos Tzolis|Greek|LW
Konstantinos Karetsas|Greek|RW
Anastasios Bakasetas|Greek|CAM
Armando Broja|Albanian|ST
Kristjan Asllani|Albanian|CM
Berat Djimsiti|Albanian|CB
Elseid Hysaj|Albanian|RB
Thomas Strakosha|Albanian|GK
Edin Džeko|Bosnian|ST
Sead Kolašinac|Bosnian|LB
Ermedin Demirović|Bosnian|ST
Benjamin Tahirović|Bosnian|CM
Jan Oblak|Slovenian|GK
Benjamin Šeško|Slovenian|ST
Jaka Bijol|Slovenian|CB
Stefan Savić|Montenegrin|CB
Eljif Elmas|Macedonian|CAM
Enis Bardhi|Macedonian|CAM
Edon Zhegrova|Kosovan|RW
Vedat Muriqi|Kosovan|ST
Milot Rashica|Kosovan|LW
Radu Drăgușin|Romanian|CB
Nicolae Stanciu|Romanian|CAM
Răzvan Marin|Romanian|CM
Dennis Man|Romanian|RW
Ianis Hagi|Romanian|CAM
Aleksandr Golovin|Russian|CAM
Matvey Safonov|Russian|GK
Aleksei Miranchuk|Russian|CAM
`;

  // Lowercase, no accents or punctuation: "Mbappé" and "mbappe" are the same key.
  const key = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ł/g, 'l').replace(/ð/g, 'd').replace(/ı/g, 'i').replace(/ß/g, 'ss')
    .replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  const curated = LIST.trim().split('\n').map((line) => {
    const [name, nat, pos, aliases] = line.split('|');
    return { name, nat, pos, aliases: aliases ? aliases.split(';') : [] };
  });

  const byKey = new Map();
  const byToken = new Map(); // single name parts → players, for "Saka" or "Gvardiol"
  function index(p, custom) {
    [p.name, ...p.aliases].forEach((n) => byKey.set(key(n), p));
    key(p.name).split(' ').forEach((tok) => {
      if (tok.length < 3) return;
      if (!byToken.has(tok)) byToken.set(tok, []);
      byToken.get(tok).push(p);
    });
    if (custom) p.custom = true;
  }
  // Squad players first (they carry club and date of birth), then the hand-written
  // list adds aliases such as "Vini Jr" and its in-game position and nationality,
  // which are more precise than a squad list's ("CAM" rather than "midfielder").
  const normNat = (n) => (FC26.compliance ? FC26.compliance.normNat(n) : n);
  const squadClubs = (FC26.squads && FC26.squads.clubs) || {};
  const players = [];
  // Squads from leagues outside the challenge club list (squads-extra.js) come after the main ones.
  const extraClubs = {};
  (((FC26.extraSquads && FC26.extraSquads.leagues) || [])).forEach((lg) => Object.assign(extraClubs, lg.clubs));
  // Loanees are listed at both clubs: the one they're playing for wins.
  [squadClubs, extraClubs].forEach((clubs) => {
    [(row) => row[4] !== 'out', (row) => row[4] === 'out'].forEach((pass) => {
      Object.keys(clubs).forEach((club) => {
        clubs[club].filter(pass).forEach(([name, pos, dob, nat]) => {
          if (byKey.has(key(name))) return; // same name at two clubs: keep the first
          const p = { name, nat: normNat(nat), pos, dob, club, aliases: [] };
          players.push(p);
          index(p);
        });
      });
    });
  });
  curated.forEach((p) => {
    const existing = byKey.get(key(p.name));
    if (existing) {
      existing.nat = p.nat || existing.nat;
      existing.pos = p.pos || existing.pos;
      existing.curated = true;
      p.aliases.forEach((a) => { if (!byKey.has(key(a))) byKey.set(key(a), existing); });
      return;
    }
    p.curated = true;
    players.push(p);
    index(p);
  });

  /** Up to `limit` players whose name starts with (or contains) the text, for autocomplete. */
  function search(text, limit) {
    const k = key(text);
    if (k.length < 2) return [];
    const starts = [];
    const contains = [];
    for (const p of players) {
      const pk = key(p.name);
      if (pk.startsWith(k) || pk.split(' ').some((w) => w.startsWith(k))) starts.push(p);
      else if (pk.includes(k)) contains.push(p);
      if (starts.length >= (limit || 20)) break;
    }
    return starts.concat(contains).slice(0, limit || 20);
  }

  /** Age on a date ("YYYY-MM-DD") from a date of birth, or '' if unknown. */
  function ageOn(dob, day) {
    if (!dob || !day) return '';
    const [y, m, d] = dob.split('-').map(Number);
    const [Y, M, D] = day.split('-').map(Number);
    return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
  }

  /** Add a name the player confirmed is real (not a regen). */
  function addKnown(name, nat, pos) {
    const k = key(name);
    if (!k || byKey.has(k)) return;
    index({ name: String(name).trim(), nat: nat || '', pos: pos || '', aliases: [] }, true);
  }

  /**
   * Who is this? Returns { player } for a confident match, { candidates } when
   * a single name fits several players, or null when it isn't recognised.
   */
  function recognise(name) {
    const k = key(name);
    if (!k) return null;
    if (byKey.has(k)) return { player: byKey.get(k) };
    const tokens = k.split(' ').filter((t) => t.length >= 3);
    if (!tokens.length) return null;
    // Every typed part must belong to the same player's name.
    let pool = byToken.get(tokens[0]) || [];
    tokens.slice(1).forEach((tok) => { pool = pool.filter((p) => key(p.name).split(' ').includes(tok)); });
    const unique = Array.from(new Set(pool));
    if (unique.length === 1) return { player: unique[0] };
    // "Saka" means Bukayo Saka, not a youth player of the same name: when exactly
    // one match is a well-known player, that's who people mean.
    const famous = unique.filter((p) => p.curated);
    if (famous.length === 1) return { player: famous[0] };
    if (unique.length > 1) return { candidates: famous.concat(unique.filter((p) => !p.curated)).slice(0, 5) };
    return null;
  }

  /** The player with exactly this name (accents and case aside), or null. */
  const lookup = (name) => byKey.get(key(name)) || null;

  FC26.playerDB = { players, curated, recognise, lookup, search, addKnown, ageOn, key };
})(typeof window !== 'undefined' ? window : globalThis);
