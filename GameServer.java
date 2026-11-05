// Authoritative game state/API for the Chomicza Nora clicker (JDK 11+).
// Run as the authoritative game API behind the HTTPS reverse proxy.
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.*;
import java.net.http.*;
import java.util.regex.*;

public final class GameServer {
  static final int PORT = Integer.getInteger("gameport", 8081);
  static final long MAX_SCORE=4_000_000_000_000_000_000L;
  static final Path DB = Paths.get(System.getProperty("gamedata", "game-season2.tsv"));
  static final Path BAN_FILE=Paths.get(System.getProperty("gamebans","game-season2.bans"));
  static final Set<String> BANS=ConcurrentHashMap.newKeySet();
  static final String ADMIN_TOKEN=System.getenv().getOrDefault("RANKING_ADMIN_TOKEN","");
  static final String COOKIE = "cn_game";
  static final SecureRandom RNG = new SecureRandom();
  static final Object LOCK = new Object();
  static final Map<String, Player> PLAYERS = new ConcurrentHashMap<>();
  static final Map<String, int[]> CLICKS = new ConcurrentHashMap<>();
  static final Map<String, long[]> NEW_SESSIONS = new ConcurrentHashMap<>();
  static volatile int mcPlayersOnline;
  static volatile String activeEvent=""; static volatile long eventEnds, nextEvent=System.currentTimeMillis()+90000, eventId;
  static final HttpClient HTTP=HttpClient.newHttpClient();
  static final String[] IDS = {"paw","hamster","wheel","pi","mc","lab","rack","gpu","ai","dc"};
  static final double[] BASE = {50,15,120,900,7000,60000,600000,7000000,90000000,1200000000};
  static final double[] GROWTH = {1.7,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15,1.15};
  static final double[] CPS = {0,1,4,14,50,180,700,2800,11000,45000};
  static final Pattern ACTION = Pattern.compile("\"action\"\\s*:\\s*\"([a-z]+)\"");
  static final Pattern ARG = Pattern.compile("\"(id|nick)\"\\s*:\\s*\"([^\"\\\\]{1,32})\"");
  static final Set<String> ORIGINS = Set.of("https://www.chomiczanora.pl","https://chomiczanora.pl");

  static final class Player {
    String nick = "Chomik", lastEventResult=""; long nuts, total, run, last = System.currentTimeMillis(); double remainder, activeRemainder;
    int seeds, lastMult, passClaimed; long clicks, bets, won, lost, lastBet; double passXp, xpRemainder;
    String passId=month(); long passBoostUntil; Map<String,Integer> owned = new HashMap<>(); Map<String,Long> stats=new HashMap<>();
    Set<String> achievements=new HashSet<>(), once = new HashSet<>(); long lastBonus, repairWindow, lastEventClaim=-1,lastDrop; int repair, repairRate,eventCps=1,eventClick=1;long cpsUntil,clickUntil;
    synchronized void tick() {
      updateWorld();
      long now = System.currentTimeMillis();
      double elapsed=Math.max(0,(now-last)/1000.0);
      double activeSeconds=Math.min(15,elapsed);
      double offlineSeconds=Math.min(7200,Math.max(0,elapsed-activeSeconds));
      remainder += cps() * (activeSeconds + offlineSeconds * 0.25);
      long earned = (long)remainder; remainder -= earned;
      nuts=sat(nuts,earned);total=sat(total,earned);run=sat(run,earned);last=now;
      double trackedSeconds=Math.min(7200,elapsed);activeRemainder+=trackedSeconds;long active=(long)activeRemainder;activeRemainder-=active;stats.put("time",stats.getOrDefault("time",0L)+active);addXp(this,trackedSeconds*2.0/60.0);
      if(!passId.equals(month())){passId=month();passXp=0;passClaimed=0;}
      updateWorld();
      checkAchievements(this);
    }
    double cps() {
      double out=0;
      for (int i=0;i<IDS.length;i++) {
        double producerMult=1;
        if(i>0&&once.contains(IDS[i]+"1"))producerMult*=2;
        if(i>0&&once.contains(IDS[i]+"2"))producerMult*=2;
        out += CPS[i] * owned.getOrDefault(IDS[i],0) * producerMult;
      }
      double mult=1 + 0.04*Math.sqrt(seeds);
      for(String x:once) if(x.equals("oc")||x.equals("psu")) mult*=1.25;
      if(once.contains("water")) mult*=1.5; if(once.contains("fusion")) mult*=2;
      if(System.currentTimeMillis()<passBoostUntil)mult*=7;
      if(System.currentTimeMillis()<cpsUntil)mult*=eventCps;
      mult*=seasonMult();mult*=1+0.05*Math.min(mcPlayersOnline,10);
      if(activeEvent.equals("outage"))mult*=0.5;
      return out*mult*(1+0.01*achievements.size());
    }
    long cost(int i) { return (long)Math.min(MAX_SCORE,Math.ceil(BASE[i]*Math.pow(GROWTH[i], owned.getOrDefault(IDS[i],0)))); }
    String json() {
      StringBuilder b=new StringBuilder("{\"nuts\":").append(nuts).append(",\"total\":").append(total)
        .append(",\"run\":").append(run).append(",\"cps\":").append(cps()).append(",\"seeds\":").append(seeds)
        .append(",\"clicks\":").append(clicks).append(",\"bets\":").append(bets).append(",\"lastMult\":").append(lastMult).append(",\"lastBet\":").append(lastBet).append(",\"owned\":{");
      int i=0; for(String id:IDS){if(i++>0)b.append(','); b.append('"').append(id).append("\":").append(owned.getOrDefault(id,0));}
      b.append("},\"once\":["); i=0; for(String id:once){if(i++>0)b.append(',');b.append('"').append(id).append('"');}
      b.append("],\"nick\":\"").append(escape(nick)).append("\",\"won\":").append(won)
        .append(",\"lost\":").append(lost).append(",\"passXp\":").append((int)passXp).append(",\"passClaimed\":").append(passClaimed).append(",\"passId\":\"").append(passId).append("\",\"ach\":[");
      i=0;for(String id:achievements){if(i++>0)b.append(',');b.append('"').append(id).append('"');}
      b.append("],\"stats\":{");i=0;for(Map.Entry<String,Long> e:stats.entrySet()){if(i++>0)b.append(',');b.append('"').append(e.getKey()).append("\":").append(e.getValue());}
      updateWorld();
      b.append("},\"event\":\"").append(activeEvent).append("\",\"eventId\":").append(eventId)
        .append(",\"eventEnds\":").append(eventEnds).append(",\"mcPlayers\":").append(mcPlayersOnline)
        .append(",\"eventResult\":\"").append(escape(lastEventResult)).append('"')
        .append(",\"passBoostUntil\":").append(passBoostUntil).append(",\"cpsUntil\":").append(cpsUntil).append(",\"clickUntil\":").append(clickUntil)
        .append(",\"eventCps\":").append(eventCps).append(",\"eventClick\":").append(eventClick);
      return b.append('}').toString();
    }
  }

  static String month(){java.time.LocalDate d=java.time.LocalDate.now(java.time.ZoneId.of("Europe/Warsaw"));return d.getYear()+"-"+String.format("%02d",d.getMonthValue());}
  static long sat(long a,long b){if(b<=0)return a;return a>MAX_SCORE-b?MAX_SCORE:a+b;}
  static void award(Player p,long n){p.nuts=sat(p.nuts,n);p.total=sat(p.total,n);p.run=sat(p.run,n);}
  static synchronized void updateWorld(){long now=System.currentTimeMillis();if(!activeEvent.isEmpty()&&now>=eventEnds){activeEvent="";eventEnds=0;}if(activeEvent.isEmpty()&&now>=nextEvent){String[] types={"golden","golden","golden","golden","golden","hamster","hamster","hamster","rain","rain","outage"};activeEvent=types[RNG.nextInt(types.length)];eventId++;eventEnds=now+(activeEvent.equals("golden")?10000:activeEvent.equals("hamster")?8000:activeEvent.equals("rain")?15000:45000);nextEvent=eventEnds+120000+RNG.nextInt(180001);}}
  static boolean hasSeason(){java.time.LocalDate d=java.time.LocalDate.now(java.time.ZoneId.of("Europe/Warsaw"));int m=d.getMonthValue(),day=d.getDayOfMonth(),y=d.getYear();java.time.LocalDate e=easter(y);return(m==12&&day>=31)||(m==1&&day<=2)||(m==2&&day>=13&&day<=14)||d.equals(e.minusDays(52))||!d.isBefore(e.minusDays(2))&&!d.isAfter(e.plusDays(1))||(m==6&&day==1)||(m==6&&day>=21)||m==7||m==8||(m==10&&day>=25)||(m==11&&day<=2)||(m==11&&(day==11||day==29||day==30))||d.equals(blackFriday(y))||(m==12&&day>=5&&day<=6)||(m==12&&day>=15&&day<=30);}
  static double seasonMult(){java.time.LocalDate d=java.time.LocalDate.now(java.time.ZoneId.of("Europe/Warsaw"));int m=d.getMonthValue(),day=d.getDayOfMonth(),year=d.getYear();java.time.LocalDate easter=easter(year);if((m==12&&day>=31)||(m==1&&day<=2))return 1.5;if(m==2&&day>=13&&day<=14)return 1.5;if(d.equals(easter.minusDays(52))||!d.isBefore(easter.minusDays(2))&&!d.isAfter(easter.plusDays(1)))return 1.5;if(m==6&&day==1)return 1.5;if(m==11&&(day==11||day==29||day==30)||d.equals(blackFriday(year)))return 1.5;if(m==12&&day>=5&&day<=6)return 1.5;return 1;}
  static java.time.LocalDate easter(int y){int a=y%19,b=y/100,c=y%100,d=b/4,e=b%4,f=(b+8)/25,g=(b-f+1)/3,h=(19*a+b-d-g+15)%30,i=c/4,k=c%4,l=(32+2*e+2*i-h-k)%7,m=(a+11*h+22*l)/451,mo=(h+l-7*m+114)/31,day=(h+l-7*m+114)%31+1;return java.time.LocalDate.of(y,mo,day);}
  static java.time.LocalDate blackFriday(int y){java.time.LocalDate first=java.time.LocalDate.of(y,11,1);int days=(java.time.DayOfWeek.THURSDAY.getValue()-first.getDayOfWeek().getValue()+7)%7;return first.plusDays(days+22);}
  static void pollMinecraft(){try{HttpRequest q=HttpRequest.newBuilder(URI.create("https://api.mcsrvstat.us/3/mc.chomiczanora.pl")).timeout(java.time.Duration.ofSeconds(8)).GET().build();String s=HTTP.send(q,HttpResponse.BodyHandlers.ofString()).body();Matcher m=Pattern.compile("\\\"players\\\"\\s*:\\s*\\{[^}]*\\\"online\\\"\\s*:\\s*(\\d+)").matcher(s);mcPlayersOnline=m.find()?Math.min(10,Integer.parseInt(m.group(1))):0;}catch(Exception e){mcPlayersOnline=0;}}
  static void addXp(Player p,double n){p.xpRemainder+=n;long whole=(long)p.xpRemainder;p.xpRemainder-=whole;p.passXp=Math.min(3000,p.passXp+whole);}
  static void stat(Player p,String id,long n){p.stats.put(id,p.stats.getOrDefault(id,0L)+n);}
  static void checkAchievements(Player p){
    long clicks=p.clicks,total=p.total,buildings=0;for(int n:p.owned.values())buildings+=n;
    String[] ids={"c1","c100","c1k","c10k","t1k","t100k","t10m","t1b","t1t","h1","h50","lab","dc","b100","u5","uall","g1","g10","run","rain","fix","jack","broke","mcp","sea","p1","p5","hr","pass"};
    for(String id:ids){if(p.achievements.contains(id))continue;boolean ok=false;switch(id){
      case "c1":ok=clicks>=1;break;case "c100":ok=clicks>=100;break;case "c1k":ok=clicks>=1000;break;case "c10k":ok=clicks>=10000;break;
      case "t1k":ok=total>=1e3;break;case "t100k":ok=total>=1e5;break;case "t10m":ok=total>=1e7;break;case "t1b":ok=total>=1e9;break;case "t1t":ok=total>=1e12;break;
      case "h1":ok=p.owned.getOrDefault("hamster",0)>=1;break;case "h50":ok=p.owned.getOrDefault("hamster",0)>=50;break;case "lab":ok=p.owned.getOrDefault("lab",0)>=1;break;case "dc":ok=p.owned.getOrDefault("dc",0)>=1;break;case "b100":ok=buildings>=100;break;
      case "u5":ok=p.once.size()>=5;break;case "uall":ok=p.once.size()>=25;break;case "g1":ok=p.stats.getOrDefault("golden",0L)>=1;break;case "g10":ok=p.stats.getOrDefault("golden",0L)>=10;break;
      case "run":ok=p.stats.getOrDefault("caught",0L)>=1;break;case "rain":ok=p.stats.getOrDefault("drops",0L)>=50;break;case "fix":ok=p.stats.getOrDefault("fixed",0L)>=1;break;case "jack":ok=p.stats.getOrDefault("jackpot",0L)>=1;break;case "broke":ok=p.stats.getOrDefault("broke",0L)>=1;break;
      case "p1":ok=p.stats.getOrDefault("prestige",0L)>=1;break;case "p5":ok=p.stats.getOrDefault("prestige",0L)>=5;break;case "hr":ok=p.stats.getOrDefault("time",0L)>=3600;break;case "pass":ok=p.passClaimed>=30;break;case "mcp":ok=mcPlayersOnline>0;break;case "sea":ok=hasSeason();break;
    }if(ok){p.achievements.add(id);addXp(p,50);}}
  }

  public static void main(String[] args) throws Exception {
    load();
    loadBans();
    HttpServer s=HttpServer.create(new InetSocketAddress("127.0.0.1",PORT),0);
    s.createContext("/game",GameServer::handle); s.createContext("/scores",GameServer::scores);
    s.createContext("/gamba",GameServer::gambaTop); s.createContext("/admin",GameServer::admin);
    s.setExecutor(Executors.newFixedThreadPool(8)); s.start();
    ScheduledExecutorService flush=Executors.newScheduledThreadPool(3);
    flush.scheduleWithFixedDelay(GameServer::save,5,5,TimeUnit.SECONDS);
    flush.scheduleWithFixedDelay(GameServer::pollMinecraft,0,60,TimeUnit.SECONDS);
    flush.scheduleWithFixedDelay(GameServer::updateWorld,1,1,TimeUnit.SECONDS);
    Runtime.getRuntime().addShutdownHook(new Thread(GameServer::save));
    System.out.println("Game API listening on 127.0.0.1:"+PORT);
  }
  static void handle(HttpExchange x) throws IOException {
    cors(x); String origin=x.getRequestHeaders().getFirst("Origin");
    if(origin!=null&&!ORIGINS.contains(origin)){reply(x,403,"{\"error\":\"origin\"}");return;}
    if(x.getRequestMethod().equals("OPTIONS")){x.sendResponseHeaders(204,-1);return;}
    String sid=session(x); if(BANS.contains(sid)){reply(x,403,"{\"error\":\"banned\"}");return;} if(!PLAYERS.containsKey(sid)&&!allowNew(ip(x))){reply(x,429,"{\"error\":\"limit\"}");return;}
    Player p=PLAYERS.computeIfAbsent(sid,k->new Player());
    synchronized(p){p.tick();
      if(x.getRequestMethod().equals("GET")){reply(x,200,p.json());return;}
      if(!x.getRequestMethod().equals("POST")){reply(x,405,"{}");return;}
      String body=new String(x.getRequestBody().readNBytes(2049),StandardCharsets.UTF_8);
      if(body.length()>2048){reply(x,413,"{}");return;}
      Matcher am=ACTION.matcher(body); if(!am.find()){reply(x,400,"{}");return;}
      String action=am.group(1); Matcher args=ARG.matcher(body); String arg="";
      while(args.find()) if(args.group(1).equals("id")) arg=args.group(2);
      Matcher bm=Pattern.compile("\"bet\"\\s*:\\s*(\\d{1,18})").matcher(body);long bet=bm.find()?Long.parseLong(bm.group(1)):0;
      Matcher gm=Pattern.compile("\"kind\"\\s*:\\s*\"(coin|wheel)\"").matcher(body);String game=gm.find()?gm.group(1):"coin";
      switch(action){
        case "click": if(!allowClick(sid,12)||!allowClick("ip:"+ip(x),24)){reply(x,429,p.json());return;} p.clicks++;stat(p,"clicks",1);addXp(p,.2);long cv=(long)clickValue(p);award(p,cv);checkAchievements(p);break;
        case "buy": int bi=index(arg); if(bi<0){reply(x,400,p.json());return;} long cost=p.cost(bi); if(p.nuts<cost){reply(x,409,p.json());return;} p.nuts-=cost;p.owned.put(IDS[bi],p.owned.getOrDefault(IDS[bi],0)+1);addXp(p,1);checkAchievements(p);break;
        case "once": long oc=onceCost(p,arg); if(oc<0||p.once.contains(arg)||p.nuts<oc){reply(x,409,p.json());return;}p.nuts-=oc;p.once.add(arg);addXp(p,5);checkAchievements(p);break;
        case "golden": case "hamster": case "drop":
          if(!activeEvent.equals(action.equals("golden")?"golden":action.equals("hamster")?"hamster":"rain")||p.lastEventClaim==eventId||!bonusReady(p,action)){reply(x,429,p.json());return;}
          if(!action.equals("drop"))p.lastEventClaim=eventId;else if(System.currentTimeMillis()-p.lastDrop<800){reply(x,429,p.json());return;}else p.lastDrop=System.currentTimeMillis();
          if(action.equals("golden")){double roll=RNG.nextDouble();if(roll<.45){p.eventCps=7;p.cpsUntil=System.currentTimeMillis()+60000;p.lastEventResult="cps";}else if(roll<.65){p.eventClick=100;p.clickUntil=System.currentTimeMillis()+10000;p.lastEventResult="click";}else{long g=(long)Math.max(13,p.cps()*900);award(p,g);p.lastEventResult="nuts";}}
          else {long reward=(long)(action.equals("hamster")?Math.max(p.cps()*60,clickValue(p)*20):Math.max(p.cps()*2,clickValue(p)*3));award(p,reward);p.lastEventResult="nuts";}
          String sk=action.equals("golden")?"golden":action.equals("hamster")?"caught":"drops";stat(p,sk,1);addXp(p,action.equals("golden")?25:action.equals("hamster")?20:2);checkAchievements(p);break;
        case "repair": long rn=System.currentTimeMillis();if(!activeEvent.equals("outage")){reply(x,429,p.json());return;}if(rn-p.repairWindow>1000){p.repairWindow=rn;p.repairRate=0;}if(++p.repairRate>8){reply(x,429,p.json());return;}if(++p.repair<20)break;p.repair=0;long bonus=(long)Math.max(p.cps()*120,clickValue(p)*30);award(p,bonus);stat(p,"fixed",1);addXp(p,30);activeEvent="";eventEnds=0;checkAchievements(p);break;
        case "nick": if(!arg.matches("[\\p{L}\\p{N} _.-]{2,16}")){reply(x,400,p.json());return;}for(Player other:PLAYERS.values())if(other!=p&&other.nick.equalsIgnoreCase(arg)){reply(x,409,p.json());return;}p.nick=arg;break;
        case "prestige": int gain=(int)Math.cbrt(p.run/1e7); if(gain<1){reply(x,409,p.json());return;}p.seeds+=gain;p.nuts=0;p.run=0;p.owned.clear();p.once.clear();stat(p,"prestige",1);addXp(p,100);checkAchievements(p);break;
        case "claim": int level=Math.min(30,(int)(p.passXp/100));if(p.passClaimed>=level){reply(x,409,p.json());return;}while(p.passClaimed<level){p.passClaimed++;if(p.passClaimed%10==0)p.seeds++;else if(p.passClaimed%5==0)p.passBoostUntil=Math.max(System.currentTimeMillis(),p.passBoostUntil)+60000;else{long reward=(long)Math.max(p.cps()*300,clickValue(p)*100);award(p,reward);}}checkAchievements(p);break;
        case "reset": String keep=p.nick;p.nuts=p.total=p.run=p.clicks=p.bets=p.won=p.lost=p.lastBet=0;p.seeds=0;p.lastMult=0;p.owned.clear();p.once.clear();p.stats.clear();p.achievements.clear();p.passXp=0;p.passClaimed=0;p.nick=keep;p.remainder=0;p.activeRemainder=0;p.xpRemainder=0;p.passBoostUntil=p.cpsUntil=p.clickUntil=0;p.eventCps=p.eventClick=1;p.repair=0;break;
        case "gamba": if(!gamba(p,bet,game)){reply(x,409,p.json());return;}break;
        default: reply(x,400,p.json());return;
      }
      reply(x,200,p.json());
    }
  }
  static boolean isRanked(Player p){return p.total>0&&!p.nick.equals("Chomik");}
  static void scores(HttpExchange x)throws IOException{cors(x);if(!x.getRequestMethod().equals("GET")){reply(x,405,"{\"error\":\"method\"}");return;}List<Player> a=new ArrayList<>();for(Player p:PLAYERS.values())if(isRanked(p))a.add(p);a.sort((u,v)->Long.compare(v.total,u.total));StringBuilder b=new StringBuilder("[");for(int i=0;i<Math.min(25,a.size());i++){if(i>0)b.append(',');Player p=a.get(i);b.append("{\"nick\":\"").append(escape(p.nick)).append("\",\"score\":").append(p.total).append('}');}reply(x,200,b.append(']').toString());}
  static void admin(HttpExchange x)throws IOException{cors(x);if(x.getRequestMethod().equals("OPTIONS")){x.sendResponseHeaders(204,-1);return;}if(ADMIN_TOKEN.length()<24){reply(x,404,"{\"error\":\"not found\"}");return;}String h=x.getRequestHeaders().getFirst("Authorization");if(h==null||!h.startsWith("Bearer ")||!java.security.MessageDigest.isEqual(h.substring(7).trim().getBytes(StandardCharsets.UTF_8),ADMIN_TOKEN.getBytes(StandardCharsets.UTF_8))){reply(x,401,"{\"error\":\"unauthorized\"}");return;}String route=x.getRequestMethod()+" "+x.getRequestURI().getPath();if(route.equals("GET /admin/scores")){reply(x,200,adminScores());return;}if(route.equals("GET /admin/bans")){reply(x,200,bansJson());return;}if(!x.getRequestMethod().equals("POST")){reply(x,404,"{}");return;}String body=new String(x.getRequestBody().readNBytes(2049),StandardCharsets.UTF_8);if(body.length()>2048){reply(x,413,"{}");return;}Matcher im=Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-f]{32})\"").matcher(body),nm=Pattern.compile("\"nick\"\\s*:\\s*\"([^\"\\\\]{1,64})\"").matcher(body);String id=im.find()?im.group(1):"";switch(route){case "POST /admin/delete":if(PLAYERS.remove(id)==null){reply(x,404,"{}");return;}break;case "POST /admin/ban":PLAYERS.remove(id);BANS.add(id);saveBans();break;case "POST /admin/unban":if(!BANS.remove(id)){reply(x,404,"{}");return;}saveBans();break;case "POST /admin/rename":if(!nm.find()){reply(x,400,"{}");return;}String nn=nm.group(1).trim();if(!nn.matches("[\\p{L}\\p{N} _.-]{2,16}")){reply(x,400,"{}");return;}for(Player p:PLAYERS.values())if(PLAYERS.get(id)!=p&&p.nick.equalsIgnoreCase(nn)){reply(x,409,"{}");return;}Player target=PLAYERS.get(id);if(target==null){reply(x,404,"{}");return;}target.nick=nn;break;case "POST /admin/clearflag":if(!PLAYERS.containsKey(id)){reply(x,404,"{}");return;}break;default:reply(x,404,"{}");return;}save();reply(x,200,"{\"ok\":true}");}
  static String adminScores(){List<Map.Entry<String,Player>> a=new ArrayList<>(PLAYERS.entrySet());a.sort((u,v)->Long.compare(v.getValue().total,u.getValue().total));StringBuilder b=new StringBuilder("[");for(int i=0;i<a.size();i++){if(i>0)b.append(',');Map.Entry<String,Player> e=a.get(i);Player p=e.getValue();b.append("{\"id\":\"").append(e.getKey()).append("\",\"nick\":\"").append(escape(p.nick)).append("\",\"score\":").append(p.total).append(",\"flags\":0,\"flag\":\"\",\"gw\":").append(p.won).append(",\"gl\":").append(p.lost).append('}');}return b.append(']').toString();}
  static String bansJson(){StringBuilder b=new StringBuilder("[");int i=0;for(String id:BANS){if(i++>0)b.append(',');b.append('"').append(id).append('"');}return b.append(']').toString();}
  static void loadBans(){if(!Files.exists(BAN_FILE))return;try{for(String l:Files.readAllLines(BAN_FILE))if(l.matches("[0-9a-f]{32}"))BANS.add(l);}catch(IOException e){System.err.println("Cannot load bans: "+e.getMessage());}}
  static void saveBans(){try{Files.write(BAN_FILE,BANS,StandardCharsets.UTF_8);}catch(IOException e){System.err.println("Cannot save bans: "+e.getMessage());}}
  static void gambaTop(HttpExchange x)throws IOException{
    cors(x);if(!x.getRequestMethod().equals("GET")){reply(x,405,"{\"error\":\"method\"}");return;}
    List<Player> won=new ArrayList<>(),lost=new ArrayList<>();
    for(Player p:PLAYERS.values())if(isRanked(p)&&p.bets>0){if(p.won>0)won.add(p);if(p.lost>0)lost.add(p);}
    won.sort((u,v)->Long.compare(v.won,u.won));lost.sort((u,v)->Long.compare(v.lost,u.lost));
    StringBuilder b=new StringBuilder("{\"won\":[");
    for(int i=0;i<Math.min(5,won.size());i++){if(i>0)b.append(',');Player p=won.get(i);b.append("{\"nick\":\"").append(escape(p.nick)).append("\",\"amount\":").append(p.won).append('}');}
    b.append("],\"lost\":[");
    for(int i=0;i<Math.min(5,lost.size());i++){if(i>0)b.append(',');Player p=lost.get(i);b.append("{\"nick\":\"").append(escape(p.nick)).append("\",\"amount\":").append(p.lost).append('}');}
    reply(x,200,b.append("]}").toString());
  }
  static double clickValue(Player p){double v=(1+p.owned.getOrDefault("paw",0))*(1+0.04*Math.sqrt(p.seeds));if(p.once.contains("gloves"))v*=2;if(System.currentTimeMillis()<p.clickUntil)v*=p.eventClick;return v+p.cps()*((p.once.contains("coach")?.02:0)+(p.once.contains("champ")?.05:0));}
  static boolean bonusReady(Player p,String type){if(type.equals("drop"))return true;long now=System.currentTimeMillis();if(now-p.lastBonus<30000)return false;p.lastBonus=now;return true;}
  static long onceCost(Player p,String id){for(int i=1;i<IDS.length;i++){if(id.equals(IDS[i]+"1"))return p.owned.getOrDefault(IDS[i],0)>=10?(long)(BASE[i]*50):-1;if(id.equals(IDS[i]+"2"))return p.owned.getOrDefault(IDS[i],0)>=25?(long)(BASE[i]*400):-1;}switch(id){case "gloves":return p.owned.getOrDefault("paw",0)>=10?25000:-1;case "coach":return p.total>=5000?10000:-1;case "champ":case "oc":return p.total>=1500000?3000000:-1;case "psu":return p.total>=50000000?100000000:-1;case "water":return p.total>=1000000000?2000000000L:-1;case "fusion":return p.total>=25000000000L?50000000000L:-1;default:return -1;}}
  static int index(String id){for(int i=0;i<IDS.length;i++)if(IDS[i].equals(id))return i;return -1;}
  static boolean allowClick(String id,int limit){long now=System.currentTimeMillis();int[] v=CLICKS.computeIfAbsent(id,k->new int[]{(int)(now/1000),0});synchronized(v){int sec=(int)(now/1000);if(v[0]!=sec){v[0]=sec;v[1]=0;}return ++v[1]<=limit;}}
  static boolean allowNew(String ip){long now=System.currentTimeMillis();long[] v=NEW_SESSIONS.computeIfAbsent(ip,k->new long[]{now,0});synchronized(v){if(now-v[0]>86400000L){v[0]=now;v[1]=0;}return ++v[1]<=10;}}
  static String ip(HttpExchange x){InetAddress a=x.getRemoteAddress().getAddress();if(a.isLoopbackAddress()){String f=x.getRequestHeaders().getFirst("X-Forwarded-For");if(f!=null&&!f.isBlank()){String[]p=f.split(",");return p[0].trim();}}return a.getHostAddress();}
  static boolean gamba(Player p,long bet,String game){if(bet<1||bet>p.nuts)return false;p.nuts-=bet;p.bets++;double r=RNG.nextDouble();int mult;if(game.equals("wheel")){double[] prob={.72,.08,.10,.045,.03,.02,.004,.001};int[] m={0,1,2,3,5,10,25,100};mult=0;for(int i=0;i<m.length;i++){r-=prob[i];if(r<0){mult=m[i];break;}}}else mult=r<.485?2:0;p.lastMult=mult;p.lastBet=bet;if(mult>0){long returned=bet>MAX_SCORE/mult?MAX_SCORE:bet*mult;p.nuts=sat(p.nuts,returned);if(mult>1)p.won=sat(p.won,bet>MAX_SCORE/(mult-1)?MAX_SCORE:bet*(mult-1));}else p.lost=sat(p.lost,bet);if(mult>=10){stat(p,"jackpot",1);checkAchievements(p);}if(mult==0&&p.nuts==0&&bet>=1000)stat(p,"broke",1);return true;}
  static String session(HttpExchange x){String c=x.getRequestHeaders().getFirst("Cookie");if(c!=null)for(String part:c.split(";")){String[] a=part.trim().split("=",2);if(a.length==2&&a[0].equals(COOKIE)&&a[1].matches("[0-9a-f]{32}"))return a[1];}byte[] b=new byte[16];RNG.nextBytes(b);StringBuilder h=new StringBuilder();for(byte v:b)h.append(String.format("%02x",v&255));String id=h.toString();x.getResponseHeaders().add("Set-Cookie",COOKIE+"="+id+"; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=None");return id;}
  static void cors(HttpExchange x){String o=x.getRequestHeaders().getFirst("Origin");if(o!=null&&ORIGINS.contains(o)){x.getResponseHeaders().set("Access-Control-Allow-Origin",o);x.getResponseHeaders().set("Access-Control-Allow-Credentials","true");x.getResponseHeaders().set("Vary","Origin");}x.getResponseHeaders().set("Access-Control-Allow-Methods","GET, POST, OPTIONS");x.getResponseHeaders().set("Access-Control-Allow-Headers","Content-Type, Authorization");x.getResponseHeaders().set("Cache-Control","no-store");x.getResponseHeaders().set("X-Content-Type-Options","nosniff");}
  static void reply(HttpExchange x,int code,String s)throws IOException{byte[] b=s.getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");x.sendResponseHeaders(code,b.length);try(OutputStream o=x.getResponseBody()){o.write(b);}}
  static String escape(String s){return s.replace("\\","\\\\").replace("\"","\\\"");}
  static void load(){if(!Files.exists(DB))return;try{for(String l:Files.readAllLines(DB)){String[] a=l.split("\\t",-1);if(a.length<10)continue;Player p=new Player();p.nick=a[1];p.nuts=Long.parseLong(a[2]);p.total=Long.parseLong(a[3]);p.run=Long.parseLong(a[4]);p.seeds=Integer.parseInt(a[5]);p.last=a.length>11?Long.parseLong(a[11]):System.currentTimeMillis();p.clicks=Long.parseLong(a[6]);p.won=Long.parseLong(a[7]);p.lost=Long.parseLong(a[8]);if(!a[9].isEmpty())for(String z:a[9].split(",")){String[] q=z.split(":");if(q.length==2)p.owned.put(q[0],Integer.parseInt(q[1]));}if(a.length>10&&!a[10].isEmpty())p.once.addAll(Arrays.asList(a[10].split(",")));if(a.length>12)p.passXp=Double.parseDouble(a[12]);if(a.length>13)p.passClaimed=Integer.parseInt(a[13]);if(a.length>14)p.passId=a[14];if(a.length>15&&!a[15].isEmpty())for(String z:a[15].split(",")){String[]q=z.split(":");if(q.length==2)p.stats.put(q[0],Long.parseLong(q[1]));}if(a.length>16&&!a[16].isEmpty())p.achievements.addAll(Arrays.asList(a[16].split(",")));if(a.length>17)p.bets=Long.parseLong(a[17]);PLAYERS.put(a[0],p);}}catch(Exception e){System.err.println("Game DB load error: "+e.getMessage());}}
  static void save(){synchronized(LOCK){try{Path tmp=DB.resolveSibling(DB.getFileName()+".tmp");List<String> rows=new ArrayList<>();for(Map.Entry<String,Player> e:PLAYERS.entrySet()){Player p=e.getValue();synchronized(p){StringBuilder own=new StringBuilder(),stats=new StringBuilder();for(String id:IDS)if(p.owned.containsKey(id)){if(own.length()>0)own.append(',');own.append(id).append(':').append(p.owned.get(id));}for(Map.Entry<String,Long> st:p.stats.entrySet()){if(stats.length()>0)stats.append(',');stats.append(st.getKey()).append(':').append(st.getValue());}rows.add(e.getKey()+"\t"+p.nick.replace('\t',' ')+"\t"+p.nuts+"\t"+p.total+"\t"+p.run+"\t"+p.seeds+"\t"+p.clicks+"\t"+p.won+"\t"+p.lost+"\t"+own+"\t"+String.join(",",p.once)+"\t"+p.last+"\t"+p.passXp+"\t"+p.passClaimed+"\t"+p.passId+"\t"+stats+"\t"+String.join(",",p.achievements)+"\t"+p.bets);}}Files.write(tmp,rows,StandardCharsets.UTF_8);Files.move(tmp,DB,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(Exception e){System.err.println("Game DB save error: "+e.getMessage());}}}
}
