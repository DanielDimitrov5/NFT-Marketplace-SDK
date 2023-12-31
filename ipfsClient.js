import { Buffer } from 'buffer';
import { create } from "ipfs-http-client";

class ipfsClient {
    
    constructor(projectId, projectSecret) {
        const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
        
        this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            apiPath: '/api/v0',
            headers: {
                authorization: auth,
            }
        });
    }

    async addFile(file) {
        const added = await this.ipfs.add(file);
        return added.path;
    }
}

export default ipfsClient;