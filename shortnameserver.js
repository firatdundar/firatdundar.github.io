const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const path = require('path');
const port = 3000;
const cors = require('cors');
app.use(cors());

app.use(cors()); // Enable CORS
app.use(express.static(__dirname));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.css'));
});

app.post('/process-input', async (req, res) => {
  const inputValue = req.body.inputValue;

  const sleep = require('timing-functions').sleep;

  const processItem = function* (item) {
    yield JSON.stringify(item);
  };

  const main = async function* (startURL) {
    let next = startURL;
    let first = true;
    while (next) {
      try {
        const response = await fetch(next, {
          headers: { Accept: 'application/json' },
        });
        if (response.status === 408) {
          //await sleep(60000);
          continue;
        } else if (response.status === 204) {
          break;
        }
        const payload = await response.json();
        for (const item of payload.results) {
          yield item; // Yield each item from the generator
        }
        next = payload.next;
        if (!next) {
          break;
        }
        //await sleep(0);
      } catch (error) {
        console.error('Error:', error);
        break;
      }
    }
  };



  /////////////////////////////////
  const baseURL = 'https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/uniprot/';
  const requestURL = baseURL + inputValue;
  const results = []; // Initialize an array to store the results

  for await (const result of main(requestURL)) {
    results.push(result); // Add each result to the results array
  }

  var databasear = [];
  for (let i = 0; i < results.length; i++) {
    var databasedict = ((results[i])['metadata'])['member_databases'];
    for (let b = 0; b < (Object.keys(databasedict)).length; b++) {
      var databasename = Object.keys(databasedict)[b];
      if (!(databasename in databasear)) {
        databasear.push(databasename);
      }
    }
  }

  var databasedict = {};
  for (let i = 0; i < (databasear).length; i++) {
    var linkkey = databasear[i];
    const requrl = 'https://www.ebi.ac.uk/interpro/api/entry/' + linkkey + '/protein/uniprot/' + inputValue + '?extra_fields=short_name';
    const resultdb = []; // Initialize an array to store the results

    for await (const result of main(requrl)) {
      resultdb.push(result); // Add each result to the results array
    }

    databasedict[linkkey] = resultdb;
  }
  var finaldict = {};
  ////////////////////////////////
  for (let i = 0; i < (databasear).length; i++) {

    var result = databasedict[Object.keys(databasedict)[i]];
    var datadict = new Object();
    const typenames = [];

    var numberofelements = 0

    console.log("aa", result);

    //Creating a array of typenames
    if (result != undefined) {
      for (let a = 0; a < result.length; a++) {
        var typename = ((result[a])['metadata'])['type'];
        if (Object.keys(databasedict)[i] == "pfam") {
          typenames[0]="domain";
        }
        else if(typename in typenames){
        }
        else {
          typenames[numberofelements] = typename;
          numberofelements++;
        }
      }

      //Creating type keys with empty dictionary
      for (let b = 0; b < typenames.length; b++) {
        datadict[typenames[b]] = [];
      }

      //Adding information on typenames
      for (let c = 0; c < result.length; c++) {
        var metadata = ((result[c])['metadata']);
        var proteins = ((result[c])['proteins']);
        var shortname = ((result[c])['extra_fields']);
        shortname = shortname['short_name'];

        var type = metadata['type'];
        var name = metadata['name'];



        var newdict = new Object();
        newdict['name'] = name;
        newdict['databases'] = metadata['member_databases'];

        var proteinlength = (proteins[0])['protein_length'];
        var entries = ((proteins[0])['entry_protein_locations']);
        newdict['shortname'] = shortname;
        newdict['proteinlength'] = proteinlength;

        for (let e = 0; e < entries.length; e++) {
          var fragment = ((entries[e])['fragments'])[0];
          var start = fragment['start'];
          var end = fragment['end'];
          newdict[e] = [start, end]; 
        }
        

        console.log("type", Object.keys(databasedict)[i]);
        if (Object.keys(databasedict)[i] == "pfam"){
          datadict["domain"].push(newdict);
          console.log("pfamm", newdict);
        }
        else{
          datadict[type].push(newdict);
        }

      }

      finaldict[Object.keys(databasedict)[i]] = datadict;
      console.log("b", datadict);
    }
  }

  /////////////////////////////////////////////////////////////////

  const main2 = async (startURL) => {
    let next = startURL;
    while (next) {
      const response = await fetch(next, { headers: { Accept: 'application/json' } });
      if (response.status === 408) {
        //await sleep(60000);
        continue;
      } else if (response.status === 204) {
        return null; // Or any other appropriate value when there are no results
      }
      const payload2 = await response.json();
      next = payload2.next;
      if (!next) {
        return payload2; // Return the entire payload2 object
      }
      //await sleep(1000);
    }
  };
  ////////////////////////////////////////////////////////////////
  let requestURL3 = 'https://www.ebi.ac.uk/interpro/api/protein/unreviewed/' + inputValue + '?extra_features';

  var otherFeature = await main2(requestURL3);
  console.log("otherFeature", otherFeature);
  console.log("keys", Object.keys(otherFeature));
  if (Object.keys(otherFeature).length != 0 && Object.keys(otherFeature).includes('TRANSMEMBRANE')){
    console.log("otherFeatureInside");
    var fragmentOther = otherFeature["TRANSMEMBRANE"]["locations"];
    var newdict = new Object();
    for (let i = 0; i < fragmentOther.length; i++){
      var part = fragmentOther[i]["fragments"][0];
      var start = part["start"];
      var end = part["end"];
      newdict[i]=[start,end];
    }
    newdict["shortname"]=null;
    newdict["dummy1"]=null;
    newdict["dummy2"]=null;
    newdict["dummy3"]=null;
    var dataDict = new Object();
    dataDict["TRANSMEMBRANE"] = [newdict];
    finaldict[otherFeature["TRANSMEMBRANE"]["source_database"]]=dataDict;
    console.log("newDict",newdict);
  }
  //////////////////////////////////////////////////////////////////





  let BASE_URL = 'https://www.ebi.ac.uk/interpro/api/protein/UniProt/';
  const requestURL2 = BASE_URL + inputValue;

  var sequencedata = await main2(requestURL2);
  console.log('API Response:', sequencedata);
  var sequence = (sequencedata["metadata"])["sequence"];


  console.log('Database results:', sequence);

  finaldict['sequence'] = sequence;


  // Log the results array in the console
  console.log('Database results:', finaldict);
  //res.redirect(`/result-page?data=${encodeURIComponent(JSON.stringify(datadict))}`);
  res.json(finaldict);
});

//const exampleResult = `Processed input value: ${inputValue}`;

// Perform further processing with the results array
// ...

//res.send(datadict);
//});
//res.redirect('/result-page?data=' + encodeURIComponent(JSON.stringify(datadict)));
//});
// Send the example result and processed results as the response
//res.send({ result: exampleResult, data: results });
//});
//app.get('/result-page', (req, res) => {
// Pass the processed data to the result page as a query parameter
//res.redirect(`/result-page?data=${encodeURIComponent(JSON.stringify(processedData))}`);
//});

app.get('/result-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'future.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});