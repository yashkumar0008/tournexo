var express = require("express");
var mysql2 = require("mysql2");
var cloudinary = require("cloudinary").v2;
var fileuploader = require("express-fileupload");
const nodemailer = require("nodemailer");

require("dotenv").config();




var app = express();//app() Returns an object:app

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

app.use(fileuploader());//for receiving files from client and save on server files

app.listen(2005, function () {
    console.log("Server Started at Port no: 2005")
})

app.use(express.static("public"));

app.get("/", function (req, resp) {
    console.log(__dirname);
    console.log(__filename);

    let path = __dirname + "/public/index.html";
    resp.sendFile(path);
})

app.use(express.urlencoded(true));

//------------------------------ Cloudinary ---------------------------//
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


//---------------------------------Nodemailer-------------------------------//

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

//--------------------------------AIven started---------------------------//


let mySqlVen = mysql2.createConnection(process.env.DB_URL);
mySqlVen.connect(function (err) {
    if (err == null)
        console.log("AiVen Connected Successfulllyyy!!!!");
    else
        console.log(err.message)
})

//---------------------- Signup Phase ---------------------------------------//
// app.get("/server-signup", function (req, resp) {
//     let emailid = req.query.txtEmail;
//     let pwd = req.query.txtPwd;
//     let uType = req.query.uType;

//     mySqlVen.query("insert into users values(?,?,?,current_date(),1)", [emailid, pwd, uType], function (err) {
//         if (err == null)
//             resp.send("Signup Successfully....");
//         else
//             resp.send(err);
//     })
// })

app.get("/server-signup", function (req, resp) {
    let emailid = req.query.txtEmail;
    let pwd = req.query.txtPwd;
    let uType = req.query.uType;

    mySqlVen.query(
        "insert into users values(?,?,?,current_date(),1)",
        [emailid, pwd, uType],
        function (err) {
            if (err) {
                resp.send(err);
            } else {

                // ✅ SEND WELCOME EMAIL
                transporter.sendMail({
                    from: '"Tournexo" <yashdahiya0008@gmail.com>',
                    to: emailid,
                    subject: "Welcome to Tournexo 🎉",
                    html: `<h3>Welcome to Tournexo!</h3>
                     <p>You have successfully signed up as <b>${uType}</b>.</p>`
                });

                resp.send("Signup Successfully.... Email Sent ✅");
            }
        }
    );
});


//---------------------- Login Phase ---------------------------------------//
app.get("/do-login", function (req, resp) {
    let emailid = req.query.txtEmail1;
    let pwd = req.query.txtPwd1;

    mySqlVen.query("select * from users where emailid=? and pwd=? ", [emailid, pwd], function (err, allRecords) {
        if (allRecords.length == 1) {
            let status = allRecords[0].status;
            if (status == 0)
                resp.send("Blocked")
            else if (status == 1)
                resp.send(allRecords[0].utype);
        }
        else
            resp.send("Invalid");
    })
})

//-------------------- Orgnaizer Details --------------------------------//
app.post("/org-details", async function (req, resp) {
    let picurl = "";
    if (req.files != null) {
        let fName = req.files.profilePic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.profilePic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
            picurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

        });
    }
    else
        picurl = "nopic.jpg";

    let emailid = req.body.txtEmail;
    let orgname = req.body.txtOrgName;
    let regno = req.body.txtRegNo;
    let address = req.body.txtAddress;
    let city = req.body.txtCity;
    let deals = req.body.txtDeals;
    let website = req.body.txtWebsite;
    let social = req.body.txtSocial;
    let orghead = req.body.txtOrgHead;
    let contact = req.body.txtContact;
    let info = req.body.txtInfo;

    mySqlVen.query("insert into organizers values(?,?,?,?,?,?,?,?,?,?,?,?)", [emailid, orgname, regno, address, city, deals, website, social, orghead, contact, picurl, info], function (err) {
        if (err == null)
            resp.send("Record Saved Successfulllyyy....Badhai");
        else
            resp.send(err)
    })
})

app.post("/modify-orgdetails", async function (req, resp) {
    let picurl = "";
    if (req.files != null) //user wants to Update Profile Pic
    {
        let fName = req.files.profilePic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.profilePic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
            picurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

            console.log(picurl);
        });
    }
    else
        picurl = req.body.hdn;


    let emailid = req.body.txtEmail;
    let orgname = req.body.txtOrgName;
    let regno = req.body.txtRegNo;
    let address = req.body.txtAddress;
    let city = req.body.txtCity;
    let deals = req.body.txtDeals;
    let website = req.body.txtWebsite;
    let social = req.body.txtSocial;
    let orghead = req.body.txtOrgHead;
    let contact = req.body.txtContact;
    let info = req.body.txtInfo;


    mySqlVen.query("update organizers set orgname=?,regnumber=?,address=?,city=?,sports=?,website=?,socialmedia=?,head=?,contact=?,picurl=?,otherinfo=? where emailid=?", [orgname, regno, address, city, deals, website, social, orghead, contact, picurl, info, emailid], function (err, result) {
        if (err == null) {
            if (result.affectedRows == 1)
                resp.send("Record updated Successfulllyyy....");
            else
                resp.send("Record not updated");
        }
        else
            resp.send(err.message)
    })
})

//---------------------------- Fill Data with AJAX ---------------------------------//
app.get("/get-orgdetails", function (req, resp) {
    mySqlVen.query("select * from organizers where emailid=?", [req.query.txtEmail], function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.json(allRecords);
    })
})

// ---------------------------------- Post-Tournaments -----------------------------//
app.get("/post-tournaments", function (req, resp) {

    mySqlVen.query("insert into tournaments values(null,?,?,?,?,?,?,?,?,?,?,?,?,?)", [req.query.txtEmail, req.query.txtEvent, req.query.date, req.query.time, req.query.txtAddress, req.query.txtCity, req.query.sportsCat, req.query.minAge, req.query.maxAge, req.query.lastDate, req.query.fee, req.query.prizeMoney, req.query.txtContact], function (err) {
        if (err == null)
            resp.send("Tournament Post Successfully...");
        else
            resp.send(err);
    })
})

app.get("/fetch-alldata-email", function (req, resp) {
    let emailid = req.query.emailid;
    mySqlVen.query("select * from tournaments where emailid=?", [emailid], function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.send(allRecords);
    })
})

app.get("/delete-tournaments", function (req, resp) {
    let rid = req.query.rid;
    mySqlVen.query("delete from tournaments where rid=?", [rid], function (err, result) {
        if (err == null) {
            if (result.affectedRows == 1)
                resp.send("Event Deleted Successfulllyyyy...");
            else
                resp.send("Invalid rid");
        }
        else
            resp.send(err);

    })
})

//============================AI==========================================//

async function RajeshBansalKaChirag(imgurl) {
    const myprompt = "Read the text on picture and tell all the information in adhaar card and give output STRICTLY in JSON format {adhaar_number:'', name:'', gender:'', dob: ''}. Dont give output as string."
    const imageResp = await fetch(imgurl)
        .then((response) => response.arrayBuffer());

    const result = await model.generateContent([
        {
            inlineData: {
                data: Buffer.from(imageResp).toString("base64"),
                mimeType: "image/jpeg",
            },
        },
        myprompt,
    ]);
    console.log(result.response.text())

    const cleaned = result.response.text().replace(/```json|```/g, '').trim();
    const jsonData = JSON.parse(cleaned);
    console.log(jsonData);

    return jsonData

}

//-------------------------players-details -------------------------------//

app.post("/player-details", async function (req, resp) {

    let jsonData = [];
    let adhaarPicUrl = "";

    try {
        if (req.files != null) {
            let fName = req.files.adhaarPic.name;
            let fullPath = __dirname + "/public/uploads/" + fName;
            await req.files.adhaarPic.mv(fullPath);

            await cloudinary.uploader.upload(fullPath).then(async function (picUrlResult) {
                adhaarPicUrl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

                jsonData = await RajeshBansalKaChirag(picUrlResult.url);

            });

        }
        else
            adhaarPicUrl = "nopic.jpg";
    }
    catch (err) {
        resp.send(err.message)
    }

    let profilePicUrl = "";
    if (req.files != null) {
        let fName = req.files.profilePic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.profilePic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
            profilePicUrl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

        });
    }
    else
        profilePicUrl = "nopic.jpg";


    let emailid = req.body.txtEmail;
    let address = req.body.txtAddress;
    let contact = req.body.txtContact;
    let gameplay = req.body.gamePlay;
    let info = req.body.txtInfo;

    mySqlVen.query("insert into players values(?,?,?,?,?,?,?,?,?,?)", [emailid, adhaarPicUrl, profilePicUrl, address, contact, gameplay, info, jsonData.name, jsonData.dob, jsonData.gender], function (err) {
        if (err == null)
            resp.send("Record Saved Successfulllyyy....Badhai");
        else
            resp.send(err)
    })
})

app.get("/get-playerdetails", function (req, resp) {
    mySqlVen.query("select * from players where emailid=?", [req.query.txtEmail], function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.json(allRecords);
    })
})

app.post("/modify-playerdetails", async function (req, resp) {
    let adhaarPicUrl = "";
    if (req.files && req.files.adhaarPic != null) {
        let fName = req.files.adhaarPic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.adhaarPic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
            adhaarPicUrl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

        });
    }
    else
        adhaarPicUrl = req.body.hdn;

    let profilePicUrl = "";
    if (req.files && req.files.profilePic != null) {
        let fName = req.files.profilePic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.profilePic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
            profilePicUrl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

        });
    }
    else
        profilePicUrl = req.body.hdn1;


    let emailid = req.body.txtEmail;
    let address = req.body.txtAddress;
    let contact = req.body.txtContact;
    let gameplay = req.body.gamePlay;
    let info = req.body.txtInfo;


    mySqlVen.query("update players set acardpicurl=?,profilepicurl=?,address=?,contact=?,game=?,otherinfo=? where emailid=?", [adhaarPicUrl, profilePicUrl, address, contact, gameplay, info, emailid], function (err, result) {
        if (err == null) {
            if (result.affectedRows == 1)
                resp.send("Record updated Successfulllyyy....");
            else
                resp.send("Record not updated");
        }
        else
            resp.send(err.message)
    })
})

// app.get("/fetch-all-tournaments", function (req, resp) {
//     let emailid = req.query.emailid;
//     mySqlVen.query("select * from tournaments", [emailid], function (err, allRecords) {
//         if (allRecords.length == 0)
//             resp.send("No Record Found");
//         else
//             resp.send(allRecords);
//     })
// })

//========================== All users Admin console ==========================//

app.get("/fetch-all-users", function (req, resp) {
    mySqlVen.query("select * from users", function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.send(allRecords);
    })
})

//========================= user Block & Resume ===============================//

app.get("/block-user", function (req, resp) {
    let emailid = req.query.emailid;
    mySqlVen.query("update users set status=0 where emailid=?", [emailid], function (err, result) {
        resp.send("Blocked")
    })
})

app.get("/resume-user", function (req, resp) {
    let emailid = req.query.emailid;
    mySqlVen.query("update users set status=1 where emailid=?", [emailid], function (err, result) {
        resp.send("Resume")
    })
})


//============================= Delete a user by emailid =======================//
app.get("/delete-user", function (req, resp) {
    let emailid = req.query.emailid;

    mySqlVen.query("delete from users where emailid=?", [emailid], function (err, result) {
        if (err) {
            console.log(err);
            resp.send({ success: false, message: "Error deleting user" });
        } else if (result.affectedRows === 0) {
            resp.send({ success: false, message: "No user found with this emailid" });
        } else {
            resp.send({ success: true, message: "User deleted successfully" });
        }
    });
});


//=============================================================================//
app.get("/fetch-all-admin-organizers", function (req, resp) {
    mySqlVen.query("select * from organizers", function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.send(allRecords);
    })
})

//==========================================================================//

app.get("/do-fetch-all-tournaments", function (req, resp) {
    console.log(req.query)
    mySqlVen.query("select * from tournaments where city=? and sports=?", [req.query.kuchCity, req.query.kuchGame], function (err, allRecords) {
        console.log(allRecords)
        resp.send(allRecords);
    })
})

app.get("/do-fetch-all-cities", function (req, resp) {
    mySqlVen.query("select distinct city from tournaments", function (err, allRecords) {
        resp.send(allRecords);
    })
})

//===========================================================================//

app.get("/fetch-all-admin-players", function (req, resp) {
    mySqlVen.query("select * from players", function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.send(allRecords);
    })
})

//============================================================================//

app.get("/update-password", function (req, resp) {
    let emailid = req.query.emailid;
    let oldpwd = req.query.oldPwd;
    let newpwd = req.query.newPwd;

    mySqlVen.query("update users set pwd=? where emailid=? and pwd=?", [newpwd, emailid, oldpwd], function (err, result) {
        if (err) {
            console.log(err);
            resp.send("Somthing Went Wrong, Try Again Later");
        }
        else if (result.affectedRows == 0) {
            resp.send("Wrong Emailid And Password")
        }
        else {
            resp.send("Password Updated Successfully!!");
        }
    })
})