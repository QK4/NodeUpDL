#! /usr/bin/env node

var http = require('http')
var fs = require('fs')
var parser = require('xml2json')

// Get list of episodes
function getEps(cb){
    var epsUrl = 'http://feeds.feedburner.com/nodeup'
    console.log('\nGetting episode list...')
    var requestEps = http.get(epsUrl, function(response){
        if (response.statusCode == 200){
            response.setEncoding('utf8')
            var file = fs.createWriteStream('temp.xml')
            response.pipe(file)
            file.on('finish', function(){
                file.close()
                var xml = fs.readFileSync('temp.xml')
                fs.unlink('temp.xml')
                var json = parser.toJson(xml, {object: true})
                eps = json['rss'].channel.item
                cb(eps)
            });
        } else {
            console.log('Failed to get episode list, response status code was: ' + response.statusCode)
        }
    })
}

// Download an episode, then check if another needs downloading
function downloadEp(url, i, max = i){
    var requestEp = http.get(url, function(response){
        if (response.statusCode == 302 || response.statusCode == 301){
			var newUrl = response.headers['location'];
			//console.log('Redirected to: ' + newUrl);	
			downloadEp(newUrl, i, max);
			return
		} else {
            // Create file name
            // Get episode title
            if (eps[eps.length-i].title.indexOf('-') > -1){
                titleSplit = eps[(eps.length-i)].title.split('-')
            } else {
                console.log('title does not contain -')
                titleSplit = eps[(eps.length-i)].title.split(':')
            }
            title = titleSplit[1]
            // Remove '.' from title end
            if (title.indexOf('.') == title.length-1){
                title = title.slice(0,title.length-1)
            }
            fs.mkdirSync('./nodeup')
            dest = ('./nodeup/NodeUp ' + i + ' -' + title + '.mp3')
           	console.log('Downloading ' + url + ' \nTo ' + dest + ' ...');
            // Write file
			var file = fs.createWriteStream(dest);
			response.pipe(file);
			file.on('finish', function(){
				file.close(console.log('Download Finished'));
                // Download next episode if required
                if (i < max){
                    i++
                    downloadEp(eps[(eps.length-i)].guid.$t, i, max)
                }
			}); 
        }     
    })
}

// Check user input and do what they want

// If user input 'latest'
if (process.argv[2] == 'latest') {
    getEps(function(eps){
        downloadEp(eps[0].guid.$t, eps.length)
    })
// If user input a range
} else if (process.argv[2].indexOf('-') > -1){
    getEps(function(eps){
        numbers = process.argv[2].split('-')
        downloadEp(eps[eps.length-numbers[0]].guid.$t, numbers[0], numbers[1])
    })
// If user input an episode number
} else if (Number.isInteger(parseInt(process.argv[2], 10))){
    i = parseInt(process.argv[2], 10)
    getEps(function(eps){
        if (i > 0 && i <= eps.length){
            downloadEp(eps[(eps.length-(i))].guid.$t, eps.length-(eps.length-i))
        } else {
            console.log('That episode doesn\'t seem to exist')
        }
    })
// If user input 'all'
} else if (process.argv[2] == 'all'){
    getEps(function(eps){
        downloadEp(eps[eps.length-1].guid.$t, 1, eps.length)
    })
// If user input 'list'
} else if (process.argv[2] == 'list'){
    getEps(function(eps){
        for (i=eps.length-1;i>-1;i--){
            console.log(eps[i].title)
        }
    })
// If user input something else
} else {
    console.log(
        'Usage: nodeupdl [\'latest\'] or [\'all\'] or [episode number] or [episode range] or [\'list\']' +
        '\neg. nodeupdl latest' + 
        '\n    nodeupdl all' +
        '\n    nodeupdl 25' +
        '\n    nodeupdl 75-100' +
        '\n    nodeupdl list'
    )
}

