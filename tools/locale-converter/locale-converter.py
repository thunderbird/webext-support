#!/usr/bin/env python3

import os, sys, json, re, io

#------------------------------------------------

def newDir(dir):
    if not os.path.exists(dir):
       print("Directory doesn't exist. Creating. <" +  dir + ">")
       os.makedirs(dir)

def convert(source, destination, current = None):
    dir = source if current == None else current
    messages = ""
    
    for name in os.listdir(dir):
        path = os.path.join(dir, name)
        
        if os.path.isfile(path):
            if path.endswith('.dtd'):
                messages = messages + convert_dtd(path, dir)
            if path.endswith('.properties'):
                messages = messages + convert_prop(path, dir)

        else:
            convert(source, destination, path)

    if (messages):
        # map the path from the source into the destination folder
        dest = dir.replace(source, destination);
        messagesjson = os.path.join(dest, "messages.json")
        newDir(dest)

        # check if the messagesjson already exists
        oldData = None
        if os.path.exists(messagesjson):
            with open(messagesjson, "r",  encoding='utf-8') as f:
                oldData = json.load(f)    
        
        # merge data
        newData = json.loads("{" + messages[:-1] + "}")
        if oldData:
            mergedData = oldData
            mergedData.update(newData)
        else:
            mergedData = newData
        
        # write pretty printed json file
        final = json.dumps(mergedData, indent=4, sort_keys=True, ensure_ascii=False)
        with io.open(messagesjson, "w", encoding='utf-8') as f:
            f.write(final)

        # check the file for correctness
        print(" -> TESTING " + messagesjson)
        with open(messagesjson, "r",  encoding='utf-8') as f:
            d = json.load(f)
            #print(d)




def convert_dtd(path, dir):
    print(" CONVERTING <" + path + "> to JSON")

    p = re.compile(r'\s+')
    sdtd = ''

    dtd = io.open(path, 'r', encoding='utf-8')
    dtdLines = dtd.readlines()

    for line in dtdLines:
        sline = line.strip().replace('\r','').replace('\n','')
        #print("next line >>" + line + "<<", len(line))

        if sline != '' and sline.find('<!--') == -1:
            b = p.split(sline, 2)
            b2 = b[2][0:(len(b[2])-1)]
            sdtd = sdtd + ' "' + b[1] +'"'+ ': { "message": ' + b2 + '},'

    return sdtd


def convert_prop(path, dir):
    print(" CONVERTING <" + path + "> to JSON")

    sprop = ''
    prop = io.open(path, 'r', encoding='utf-8')
    propLines = prop.readlines()

    for line in propLines:
        sline = line.strip().replace('\r','').replace('\n','')
        #print("next line >>" + line + "<<")

        if sline != '' and sline[0] != '#':
            a = sline.split('=')
            
            # search for %S and replace them by $P1$, $P2" and so on
            count = 0;
            placeholders = [];
            placeholder = ""
            while True:
                idx = a[1].find("%S")
                if (idx == -1):
                    break
                count += 1
                a[1] = a[1].replace("%S", "$P" + str(count) + "$", 1)
                placeholders.append('"P' + str(count) + '": { "content": "$' + str(count) + '"}')
                
            if len(placeholders) > 0:
                placeholder = ', "placeholders": {' + ','.join(placeholders) + '}'
                 
            sprop = sprop + ' "' + a[0] +'"'+ ': { "message": "' + a[1].replace("\"","'") + '"' + placeholder+ ' },'

    return sprop


if __name__ == "__main__":

    print ("""
      This python3 script converts legacy locale files (*.properties and *.dtd)
      to the new WebExt JSON format.""")

    if (len(sys.argv) < 2 or len(sys.argv) > 3):
        print ("""
      Legacy                              WebExt
      ------                              ------
       locale                              _locales
         |__ <languageX>                      |__ <languageX>
               |__ <myaddon.dtd>                    |__ <messages.json>
               |__ <myaddon.properties>


      Usage:
        py locale-converter.py <source> [<destination>] 
        
        If the destination folder (WebExt _locales folder) is not specified,
        the specified source folder (legacy locale folder) will be used as
        the destination folder.
        
        If there is an existing messages.json at the final destination, the
        script will attempt to merge the new strings into it.
        
      Testing:
        Each created JSON file is tested with the python function json.load(f),
        which will throw an error in case something went wrong. Run a JSON
        validator on the created json files to learn more about the error.
        
      JSON Validators:
        https://jsonlint.com/
        http://jsoneditoronline.org/
        https://jsonformatter.curiousconcept.com/
        """)

        exit()
   
    # use source as destination, if not specified
    source = sys.argv[1];
    destination = sys.argv[1];
    if (len(sys.argv) == 3):
        destination = sys.argv[2];
        
    convert(source, destination)

    print( """Done""")
