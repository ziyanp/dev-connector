const jwt = require('jsonwebtoken');
const config = require('config');

//middleware function is any which accesses the req and res. next is needed so that it moves on after it completes the function
module.exports = (req,res,next) => {

    //Get token from header
    const token = req.header('x-auth-token')

    //Check if no token
    if(!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    //verify token
    try {
        const decoded = jwt.verify(token, config.get('jwtSecret'))

        req.user = decoded.user;
        next();

    }
    catch(err) {
        res.status(401).json( {msg: 'Token is not valid '})

    }
}