import mongoose from 'mongoose'
import color from 'colors'
export const Dbconnection = async()=>{
    try {
        const result = await mongoose.connect(process.env.DATABASE_URL, {
            serverSelectionTimeoutMS: 5000
        })
        // console.log(result)
        console.log(`Database connection established `.bgMagenta)
    } catch (error) {
        console.log(`Database connection failed ` + error)
    }
}
