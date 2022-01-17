/*
   Copyright 2019 Juby210

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const express = require('express');
const app = express();
const nodeMailer = require('nodemailer');
const fs = require('fs');
const config = require('./config.json');
let cooldown = {};

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/mail', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.post('/send', (req, res) => {
    if(!req.body.type || !req.body.nick || !req.body.email) return res.send({error: true, msg: 'Type, nick and email required'});
    if(req.body.type == 'token-reset' && !req.body.bot) return res.send({error: true, msg: 'With this type bot name is required'});
    if(getCooldown(req.ip)) return res.send({error: true, msg: 'Cooldown 30 sec'});

    let transporter = nodeMailer.createTransport(config.smtp);
    let html = 'error';
    try {html = fs.readFileSync(`mail/${req.body.type}.html`).toString().replace('#NICK#', req.body.nick)} catch(e) {console.error(e)}
    let mail = {
        from: `Discord <noreply@${req.body.from ? req.body.from.split(' ')[0] : 'discordapp.com'}>`,
        sender: `noreply@${config.domain}`,
        to: req.body.email,
        html
    };
    if(req.body.type == 'password-change') {
        mail.subject = 'Discord Password Changed';
        sendMail(transporter, mail, res, req.ip);
    } else if (req.body.type == 'nitro-end') {
        mail.html = mail.html.replace('#DATE#', new Date().toLocaleString());
        mail.subject = 'Discord Nitro Expiring Soon';
        sendMail(transporter, mail, res, req.ip);
    } else if (req.body.type == 'account-disabled') {
        mail.subject = 'Account Scheduled for Deletion';
        sendMail(transporter, mail, res, req.ip);   
    } else if (req.body.type == 'token-reset') {
        mail.html = mail.html.replace('#BOT#', req.body.bot);
        mail.subject = 'Discord Bot Token Reset Due to Potential Abuse';
        sendMail(transporter, mail, res, req.ip);
    } else if (req.body.type.startsWith('tos-violation-')) {
        mail.subject = 'Account Disabled - Violation of TOS/Community Guidelines Notification'
        sendMail(transporter, mail, res, req.ip);
    } else return res.send({error: true, msg: 'Invalid type'});
});
app.get('*', (req, res) => res.redirect('https://discordapp.com'));
app.listen(config.port);

function sendMail(transporter, mail, res, ip) {
    setCooldown(ip);
    transporter.sendMail(mail, (err, info) => {
        if(err) {
            console.log(err);
            return res.send({error: true, msg: 'Unexpected error when sending email'});
        }
        res.send({error: false, msg: 'Email sent'});
    });
}

function setCooldown(ip) {
    if(!cooldown[ip]) cooldown[ip] = 0;
    cooldown[ip] = Date.now() + 30000;
}
function getCooldown(ip) {
    if(!cooldown[ip]) cooldown[ip] = 0;
    if(cooldown[ip] >= Date.now()) return true;
    return false;
}