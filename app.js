#! /usr/bin/env node

// Load modules
const http = require('http')
const fs = require('fs')
const parser = require('xml2json')

// How to use info
const help = 'Usage: nodeupdl [\'latest\'] or [\'all\'] or [episode number] or [episode range] or [\'list\']' +
    '\neg. nodeupdl latest' +
    '\n    nodeupdl all' +
    '\n    nodeupdl 25' +
    '\n    nodeupdl 75-100' +
    '\n    nodeupdl list'

// Check user input and do what they want
if (process.argv[2]){
    // If user input 'latest'
    if (process.argv[2] == 'latest') {
        getEps(function(eps){
            downloadEp(eps[0].guid.$t, eps.length)
        })
    // If user input a range
    } else if (process.argv[2].indexOf('-') > -1){
        getEps(function(eps){
            let numbers = process.argv[2].split('-')
            downloadEp(eps[eps.length-numbers[0]].guid.$t, numbers[0], numbers[1])
        })
    // If user input an episode number
    } else if (Number.isInteger(parseInt(process.argv[2], 10))){
        let i = parseInt(process.argv[2], 10)
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
        console.log(help)
    }
} else {
    // If user didn't input any arguments
    console.log(help)
}

// Get list of episodes
function getEps(cb){
    let epsUrl = 'http://feeds.feedburner.com/nodeup'
    console.log('\nGetting episode list...')
    http.get(epsUrl, function(response){
        if (response.statusCode == 200){
            response.setEncoding('utf8')
            // Change XML response to JSON then return the episodes array - does this really need to write a file?
            let file = fs.createWriteStream('temp.xml')
            response.pipe(file)
            file.on('finish', function(){
                file.close()
                let xml = fs.readFileSync('temp.xml')
                fs.unlinkSync('temp.xml')
                let json = parser.toJson(xml, {object: true})
                eps = json['rss'].channel.item // Declaring this with let breaks downloadEp()s reference to eps. But passing eps in seems silly. Needs work.
                cb(eps)
            });
        } else {
            // Tell user if it didn't work
            console.log('Failed to get episode list')
        }
    })
}

// Download an episode, then check if another needs downloading
// Parameters - url to download, episode number/low range number, high range number(optional)
function downloadEp(url, i, max = i){
    http.get(url, function(response){
        // Handle redirect
        if (response.statusCode == 302 || response.statusCode == 301){
            let newUrl = response.headers['location'];
            //console.log('Redirected to: ' + newUrl)
            downloadEp(newUrl, i, max);
            return
        } else {
            // Get episode title
            if (eps[eps.length-i].title.indexOf('-') > -1){
                var titleSplit = eps[(eps.length-i)].title.split('-')
            } else {
                var titleSplit = eps[(eps.length-i)].title.split(':')
            }

            let title = titleSplit[1]

            // Remove '.' from title end
            if (title.indexOf('.') == title.length-1){
                title = title.slice(0,title.length-1)
            }

            // Remove '/' and ':' from title
            const slash = new RegExp('/', 'g')
            const colon = new RegExp(':', 'g')
            title = title.replace(slash, '-').replace(colon, '-')

            // Set file name
            let fileName = ('./NodeUp ' + i + ' -' + title + '.mp3')
            console.log('Downloading ' + url + ' \nTo ' + fileName + ' ...')

            // Write file
            let file = fs.createWriteStream(fileName)
            response.pipe(file)
            file.on('finish', function(){
              file.close(console.log('Download Finished'))
              // Download next episode if required
              if (i < max){
                  i++
                  downloadEp(eps[(eps.length-i)].guid.$t, i, max)
              }
            });
        }
    })
}
