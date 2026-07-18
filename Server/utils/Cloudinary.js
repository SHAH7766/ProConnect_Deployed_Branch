import { v2 as cloudinary } from 'cloudinary'

const cleanEnvValue = (value) => value?.trim().replace(/^['"]|['"]$/g, '')

const getCloudinaryConfig = () => ({
    cloud_name: cleanEnvValue(process.env.CLOUD_NAME),
    api_key: cleanEnvValue(process.env.CLOUD_API_KEY),
    api_secret: cleanEnvValue(process.env.CLOUD_API_SECRET)
})

cloudinary.config({
    ...getCloudinaryConfig()
})

export const uploadImageBuffer = (buffer, folder = 'proconnect/bookings') => {
    return new Promise((resolve, reject) => {
        const config = getCloudinaryConfig()

        if (!config.cloud_name || !config.api_key || !config.api_secret) {
            reject(new Error('Cloudinary credentials are missing'))
            return
        }

        cloudinary.config(config)

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    reject(error)
                    return
                }

                resolve(result)
            }
        )

        uploadStream.end(buffer)
    })
}

export const uploadAudioBuffer = (buffer, folder = 'proconnect/chat-audio') => {
    return new Promise((resolve, reject) => {
        const config = getCloudinaryConfig()

        if (!config.cloud_name || !config.api_key || !config.api_secret) {
            reject(new Error('Cloudinary credentials are missing'))
            return
        }

        cloudinary.config(config)

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'video'
            },
            (error, result) => {
                if (error) {
                    reject(error)
                    return
                }

                resolve(result)
            }
        )

        uploadStream.end(buffer)
    })
}
