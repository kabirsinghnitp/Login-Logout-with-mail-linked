const express = require('express')
require('./db/mongoose')
require('dotenv').config()
const User = require('./models/user')
const Task = require('./models/task')
const nodemailer = require('nodemailer')
var sha256 = require('js-sha256')
const bodyParser = require('body-parser')
const session = require('express-session')
const cookieParser = require("cookie-parser")
const MongodbSession = require('connect-mongodb-session')(session)
const url = require('url');

const store = new MongodbSession({
    uri: 'mongodb://127.0.0.1:27017/task-manager-api',
    collestion: 'sessions'
})

const app = express()
const port = process.env.PORT || 3030

app.use(cookieParser())
app.use(express.json())

app.use(express.static("Public"));
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    cookie: {
        httpOnly: true,
        maxAge: null
    },
    secret: 'uniqueKey',   //********************************  change it man!! it must be secret  ******************************************//
    resave: false,
    saveUninitialized: false,
    store: store,
}))

const isAuth = (req, res, next) => {
    if(req.session.isAuth) {
        next()
    } else {
        console.log("false");
        res.redirect('/')
    }
}

app.set('view engine','ejs');


app.get('/', (req, res) => {
    res.render("index", {name: "", cross: "", wrong: ""});
})

// app.get('/home', (req, res) => {
//     res.render("home");
// })

app.post('/users', (req, res) => {
    
    const user = new User({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        email: req.body.email,
        password: sha256(req.body.password),
    })

    var mailquery = User.find({email: req.body.email}); 
    var usernamequery = User.find({username: req.body.username}); 

    mailquery.count(function (err, count) { 
        if (count === 0) {
            usernamequery.count(function (err, count2) {
                if (count2 === 0) {
                    user.save(function(err){

                        id = user._id
                        email = user.email
                        validation_code = sha256(user.username)

                        let transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: process.env.EMAIL ,    // Sender email
                                pass: process.env.PASSWORD  // Sender password
                            }
                        });
                        
                        let mailOptions = {
                            from: 'kabirsinghnitp@gmail.com',
                            to: email,
                            subject: 'Test',
                            text: `Please click on the link provided to activate the account http://localhost:3030/users/${email}/${validation_code}/${id}`
                            /////// Change text link while deploying
                        };
                        
                        transporter.sendMail(mailOptions, (err, data) => {
                            if (err) {
                                res.render("message", {message: "Error occured"})
                            } else {
                                res.render("message", {message: "Go to your gmail to verify the account"});
                            }
                    })
                    
                })
                    } else {
                    res.render('index', { name: 'Username Already exist' , cross: "BACK TO LOGIN", wrong: ""})
                    // console.log("username already exist");
                }
                })

            } else {
                res.render('index', { name: 'Email Already exist' , cross: "BACK TO LOGIN", wrong: ""})
                // console.log("user already exist");
            }
             
})
    
})

app.get('/users', (req, res) => {
    User.find({}).then((users) => {
        res.send(users)
    }).catch((e) => {
        res.send(400).send(e)
    })
})


app.get('/users/:email/:code/:id', (req, res) => {
    const email = req.params.email
    const validation_code = sha256(req.params.code)
    const _id= req.params.id

    User.findByIdAndUpdate(_id ,{"active": true, "validation_code": validation_code}, function(err, result){

        if(err){
            res.render("message", {message: "Error occured"});
        }
        else{
            res.render("message", {message: "Account verified. Go to login page"});
        }

    })
})

app.post('/reset', (req, res) => {
    email = req.body.email
    console.log(email);

    User.find({email: email}, {
    active: 0,
    _id: 1,
    first_name: 0,
    last_name: 0,
    username: 0,
    email: 0,
    password: 0,
    __v: 0}).then((users) => {

        validation_code = users[0]["validation_code"]
        id = users[0]["_id"]

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL ,    // Sender email
                pass: process.env.PASSWORD  // Sender password
            }
        });
        
        let mailOptions = {
            from: 'kabirsinghnitp@gmail.com',
            to: email,
            subject: 'Test',
            text: `Please click on the link provided to reset password http://localhost:3030/reset/${email}/${validation_code}/${id}`
            /////// Change text link while deploying
        };
        
        transporter.sendMail(mailOptions, (err, data) => {
            if (err) {
                res.render("message", {message: "Error occured"});
            } else {
                res.render("message", {message: "Go to your gmail to reset password"});
            }
    })

        
    }).catch((e) => {
        res.send(400).send(e)
    })

})

app.get('/reset/:email/:code/:id', (req, res) => {
    const email = req.params.email
    const validation_code = sha256(req.params.code)
    const id= req.params.id

    console.log(id);

    res.render("resetPassword", {id: id})

})

app.post('/signin', (req, res) => {
    email = req.body.email
    password = sha256(req.body.password)

    remember = Boolean(req.body.remember)

    User.find({email: email}, {
        active: 0,
        _id: 1,
        first_name: 0,
        last_name: 0,
        username: 0,
        __v: 0}).then((users) => {

            emaildb = users[0]["email"]
            passworddb = users[0]["password"]

            if( email == emaildb && password == passworddb ) {
                console.log("loged in");
                req.session.isAuth = true
                res.redirect("/dashboard")
            } else {
                res.render("index", {name: "", cross: "", wrong:"Wrong Credentials"})
            }
        }).catch((e) => {
            res.send(400).send(e)
        })


})

app.get("/dashboard", isAuth, (req, res) => {
    res.render("dashboard")
})

app.post('/reset-password', (req, res) => {
    password = sha256(req.body.password)
    email = req.body.email ///// this is id

    
    User.findByIdAndUpdate(email ,{"password": password}, function(err, result){

        if(err){
            res.render("message", {message: "Error occured"});
        }
        else{
            res.render("message", {message: "Password reset successful! Go to login page"});
        }

    })
})

app.post('/logout', isAuth,(req, res) => {
    req.session.destroy((err) =>{
        if(err) throw err
        const name = ""
        const cross = ""
        res.render("index", {name: "", cross: "", wrong:""});
    })
})

app.post('/tasks', (req, res) => {

    const task = new Task(req.body)

    task.save().then(() => {
        res.status(201).send(task)
    }).catch((e) => {
        res.send(400).send(e)
    })
})

app.get('/tasks', (req, res) => {
    Task.find({}).then((tasks) => {
        res.send(tasks)
    }).catch((e) => {
        res.send(400).send(e)
    })
})


app.listen(port, () => {
    console.log('Server is running on port ' + port)
})