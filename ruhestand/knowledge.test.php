<?php
declare(strict_types=1);
define('RUHESTAND_KNOWLEDGE_TEST',true);
require __DIR__.'/api.php';
function check(bool $condition,string $message):void {if(!$condition)throw new RuntimeException($message);}
$dir=sys_get_temp_dir().'/retirement-knowledge-'.bin2hex(random_bytes(5));
mkdir($dir.'/kinderleistungen',0700,true);
mkdir($dir.'/pensionskassen/sgpk',0700,true);
mkdir($dir.'/pensionskassen/pksg',0700,true);
function doc(string $text,string $date='',string $status='entwurf'):string {
    $date=$date?:gmdate('Y-m-d');
    return "---\nstatus: ".$status."\nsource_checked_at: ".$date."\nversion: \"0.1\"\n---\n# Wissen\n## Belegte Bestimmungen\n".$text."\n## Beispieltests\nNICHT_EINSPEISEN\n";
}
try {
    $ch=$dir.'/kinderleistungen/CH-AR.md';
    $sg=$dir.'/pensionskassen/sgpk/REGLEMENT_2026_KINDERLEISTUNGEN.md';
    file_put_contents($ch,doc('AHV_FAK_FIXTURE'));file_put_contents($sg,doc('SGPK_FIXTURE'));
    $city=$dir.'/pensionskassen/pksg/ABRAXAS_VORSORGEPLAN_2026.md';file_put_contents($city,doc('ABRAXAS_FIXTURE')); 
    check(count(retirement_knowledge($dir,false,'Kinderrente')['selected'])===0,'Entwuerfe muessen freigeschaltet werden');
    $all=retirement_knowledge($dir,true,'');check(count($all['available'])===3 && count($all['selected'])===0,'Inventar ohne Themenselektion');
    $r=retirement_knowledge($dir,true,'sgpk Kinderrente');check(count($r['selected'])===2,'sgpk und Kinderthema');
    check(strpos($r['selected'][0]['content'],'NICHT_EINSPEISEN')===false,'Tests nicht als Fachwissen');
    check(count(retirement_knowledge($dir,true,'Wie funktioniert die AHV?')['selected'])===1,'AHV-Auswahl');
    check(count(retirement_knowledge($dir,true,'Tennis')['selected'])===0,'Sachfremde Themen');
    check(count(retirement_knowledge($dir,true,'PK SG')['selected'])===0,'Mehrdeutige Kasse nicht zuordnen');
    foreach (['Abraxas','PK Stadt St.Gallen','Pensionskasse Stadt St. Gallen','PKSG'] as $name) {
        $selected=retirement_knowledge($dir,true,$name)['selected'];
        check(count($selected)===1 && $selected[0]['id']==='PKSG-ABRAXAS-2026','Stadt-Zuordnung '.$name);
    }
    check(count(retirement_knowledge($dir,true,'sgpk Abraxas Kinderrente')['selected'])===3,'Expliziter Vergleich');
    $selected=retirement_knowledge($dir,true,'sgpk Abraxas Kinderrente','city')['selected'];
    check(count($selected)===2 && $selected[1]['id']==='PKSG-ABRAXAS-2026','Neueste Kassennennung priorisieren');
    check(retirement_institution('PK SG')==='ambiguous','Mehrdeutigkeit erkennen');
    file_put_contents($dir.'/CH-AR.md',doc('FLAT_FIXTURE'));
    check(strpos(retirement_knowledge($dir,true,'Kinder')['selected'][0]['content'],'AHV_FAK_FIXTURE')!==false,'Unterordner gewinnt');
    unlink($ch);check(strpos(retirement_knowledge($dir,true,'Kinder')['selected'][0]['content'],'FLAT_FIXTURE')!==false,'Flache Ablage');
    file_put_contents($dir.'/CH-AR.md',doc('ALT','2000-01-01'));check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Alter Quellenstand');
    file_put_contents($dir.'/CH-AR.md',doc('FUTURE','2999-01-01'));check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Zukuenftiger Quellenstand');
    file_put_contents($dir.'/CH-AR.md','ohne Metadaten');check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Metadatenpflicht');
    file_put_contents($dir.'/CH-AR.md',doc('UNKNOWN','', 'freigegeben'));check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Kein erfundener Freigabeprozess');
    file_put_contents($dir.'/CH-AR.md',str_repeat('x',40001));check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Dateigroessenlimit');
    unlink($dir.'/CH-AR.md');
    $outside=$dir.'-outside.md';file_put_contents($outside,doc('NICHT_LESEN'));
    symlink($outside,$dir.'/CH-AR.md');check(count(retirement_knowledge($dir,true,'AHV')['selected'])===0,'Kein Link ausserhalb des Wissensordners');
    echo "OK: Wissensauswahl, Stadt-/Kantons-Zuordnung, Abraxas, Mehrdeutigkeit, Freischaltung, Pfade, Metadaten, Aktualitaet und Kontextfilter. Kein Modellaufruf.\n";
} finally {
    foreach ([$dir.'/CH-AR.md',$dir.'/kinderleistungen/CH-AR.md',$dir.'/pensionskassen/sgpk/REGLEMENT_2026_KINDERLEISTUNGEN.md',$dir.'/pensionskassen/pksg/ABRAXAS_VORSORGEPLAN_2026.md',$dir.'-outside.md'] as $file) if(is_file($file)||is_link($file))unlink($file);
    rmdir($dir.'/kinderleistungen');rmdir($dir.'/pensionskassen/sgpk');rmdir($dir.'/pensionskassen/pksg');rmdir($dir.'/pensionskassen');rmdir($dir);
}

