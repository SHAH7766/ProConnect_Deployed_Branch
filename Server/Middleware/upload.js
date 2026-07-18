import multer from 'multer'

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'))
            return
        }

        cb(null, true)
    }
})

export const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const mimeType = file.mimetype.split(';')[0].toLowerCase()
        const allowedAudioTypes = [
            'audio/webm',
            'audio/ogg',
            'audio/mpeg',
            'audio/mp4',
            'audio/wav',
            'video/webm',
            'application/octet-stream'
        ]

        if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/') && !allowedAudioTypes.includes(mimeType)) {
            cb(new Error('Only audio files are allowed'))
            return
        }

        cb(null, true)
    }
})
