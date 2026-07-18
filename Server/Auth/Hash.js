import bcrypt from 'bcrypt'
export const HashPassword = async(Password)=>{
    return await bcrypt.hash(Password,10)
}
export const ComparePassword = async(newPassword,oldPassword)=>{
    return await bcrypt.compare(newPassword,oldPassword)
}