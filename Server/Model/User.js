import mongoose from 'mongoose'
const user=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    cnic:{
        type:String,
        default:'',
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^\d{13}$/.test(v);
            },
            message: 'CNIC must be exactly 13 digits'
        }
    },
    phone:{
        type:String,
        default:''
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"user"
    }
},{timestamps:true})
export default mongoose.model('user',user)
