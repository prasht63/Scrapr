	//Index.js serves as the server
	var express = require('express');
	var app = express();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);

	//adding mysql 
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'docs'
	});

	//creating connection to database
	connection.connect();

	//to access static files
	app.use('/static', express.static(__dirname + '/public'));

	//when it gets index page request
	app.get('/', function(req, res)
	{
	  res.sendFile(__dirname + '/index.html');
	});

	//when it gets doc page request
	app.get('/doc/:docname', function(req, res)
	{
	  res.sendFile(__dirname+'/doc.html');
	});

  
	//to access the static file
	app.use(express.static(__dirname + '/public'));

	//to store data on server side
	var docs=[];	

	//to get doc parameters from all the docs
	function find(name)
	{
	  var length=docs.length;
	  for(i=0;i<length;i++)
	  {
		if(docs[i].docname==name)
		{
		  return i;
		}
	  }
	}

	//initiating connection and socket
	
	io.sockets.on('connection', function(socket) 
	{	
		//creating a new doc
	  socket.on('create', function(data) 
	  {       
		//checking for existing doc with same name
		query='SELECT * from `docdata` where docname = "' +data.docname+'"';
		
		connection.query(query, function(err, rows, fields)
		{   
			//if no error in query proceed
			if (!err) 
			{	
				//if no doc exists with the doc name tried to create
				if(rows.length==0)
					{	
						docs.push(data);
						socket.join(data.docname);
						query='Insert into `docdata` (docname) values ("' +data.docname+ '")'; 
						connection.query(query, function(err, rows, fields)
						{
							if (!err)
							{
								console.log("entry updated");
							}									
						});
						socket.emit('createfeedback' , data);
					}
					else
					{
						socket.emit('createfeedback' , 0);
						
					}
			}
			else
			{
				socket.emit('createfeedback' , 404);
			}
		});
		
		
	}); //create ends
	
	//joining a doc
	socket.on('join', function(data)
	{
		socket.join(data.docname);
		
		var n=find(data.docname);
		
		docs[n].users.push(data.users[0]);
		
		docs[n].doctext=docs[n].doctext+"";
		
		if(docs[n].numberofusers==0)
		{
			query='SELECT * from `docdata` where docname = "' +data.docname+'"';
	
			connection.query(query, function(err, rows, fields)
			{
				docs[n].doctext=rows[0].doctext;
			});

		}
		docs[n].numberofusers+=1;
		
		socket.to(data.docname).emit('anewuserjoin', docs[n]);
		
	}); //join ends
	
	//when request comes to update all docs on joining of a new user
	socket.on('updateall', function(data)
	{
		socket.to(data.docname).emit('allupdate', data);
	});
	
	//updating the database
	socket.on('updatedatabase', function(data)
	{	
		query='update `docdata` set doctext = "' +data.doctext+ '" where docname = "' +data.docname+'"';
		var n=find(data.docname);
		
		connection.query(query, function(err, rows, fields)
		{
			if (!err)
				{
					socket.to(data.docname).emit('databaseupdated');
				}	
			else
			{
				console.log(err);
			}
		});
		
	});//update database ends
	
	//sending edits to all but the sender
	socket.on('texttype', function(data)
	{
		var n=find(data.docname);
		docs[n].doctext=data.doctext;
		socket.broadcast.to(data.docname).emit('texttype', data);
	});
	
	});

	http.listen(3000, function(){
	console.log('listening on *:3000');
	});