#!/usr/bin/env python
"""
CLI wrapper for AES Key Wrap operations.
This script can be called from Node.js to generate wrapped keys.
"""
import sys
import os
import binascii
import json
from aes_keywrap import aes_wrap_key, aes_unwrap_key

def generate_random_key(key_size_bits=128):
    """Generate a random key of specified size in bits."""
    key_size_bytes = key_size_bits // 8
    return os.urandom(key_size_bytes)

def wrap_key(kek_hex, plaintext_hex):
    """
    Wrap a plaintext key using the provided KEK.
    
    Args:
        kek_hex: Key Encryption Key in hexadecimal
        plaintext_hex: Plaintext key to wrap in hexadecimal
    
    Returns:
        Wrapped key in hexadecimal
    """
    try:
        kek = binascii.unhexlify(kek_hex)
        plaintext = binascii.unhexlify(plaintext_hex)
        wrapped = aes_wrap_key(kek, plaintext)
        return binascii.hexlify(wrapped).decode().upper()
    except Exception as e:
        raise ValueError(f"Error wrapping key: {str(e)}")

def unwrap_key(kek_hex, wrapped_hex):
    """
    Unwrap a wrapped key using the provided KEK.
    
    Args:
        kek_hex: Key Encryption Key in hexadecimal
        wrapped_hex: Wrapped key in hexadecimal
    
    Returns:
        Unwrapped plaintext key in hexadecimal
    """
    try:
        kek = binascii.unhexlify(kek_hex)
        wrapped = binascii.unhexlify(wrapped_hex)
        plaintext = aes_unwrap_key(kek, wrapped)
        return binascii.hexlify(plaintext).decode().upper()
    except Exception as e:
        raise ValueError(f"Error unwrapping key: {str(e)}")

def generate_key_pair(kek_hex, key_size_bits=128):
    """
    Generate a random key and wrap it with the provided KEK.
    
    Args:
        kek_hex: Key Encryption Key in hexadecimal
        key_size_bits: Size of the key to generate in bits (default: 128)
    
    Returns:
        Dictionary with 'key_val' (plaintext) and 'key_wrap' (wrapped)
    """
    try:
        # Generate random key
        plaintext = generate_random_key(key_size_bits)
        plaintext_hex = binascii.hexlify(plaintext).decode().upper()
        
        # Wrap the key
        wrapped_hex = wrap_key(kek_hex, plaintext_hex)
        
        return {
            'key_val': plaintext_hex,
            'key_wrap': wrapped_hex
        }
    except Exception as e:
        raise ValueError(f"Error generating key pair: {str(e)}")

def main():
    """Main CLI interface."""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python key_generator.py <command> [args]',
            'commands': {
                'generate': 'python key_generator.py generate <kek_hex> [key_size_bits]',
                'wrap': 'python key_generator.py wrap <kek_hex> <plaintext_hex>',
                'unwrap': 'python key_generator.py unwrap <kek_hex> <wrapped_hex>'
            }
        }))
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        if command == 'generate':
            if len(sys.argv) < 3:
                raise ValueError('KEK hex is required')
            
            kek_hex = sys.argv[2]
            key_size_bits = int(sys.argv[3]) if len(sys.argv) > 3 else 128
            
            result = generate_key_pair(kek_hex, key_size_bits)
            print(json.dumps({
                'success': True,
                'data': result
            }))
        
        elif command == 'wrap':
            if len(sys.argv) < 4:
                raise ValueError('KEK hex and plaintext hex are required')
            
            kek_hex = sys.argv[2]
            plaintext_hex = sys.argv[3]
            
            wrapped = wrap_key(kek_hex, plaintext_hex)
            print(json.dumps({
                'success': True,
                'data': {
                    'key_wrap': wrapped
                }
            }))
        
        elif command == 'unwrap':
            if len(sys.argv) < 4:
                raise ValueError('KEK hex and wrapped hex are required')
            
            kek_hex = sys.argv[2]
            wrapped_hex = sys.argv[3]
            
            plaintext = unwrap_key(kek_hex, wrapped_hex)
            print(json.dumps({
                'success': True,
                'data': {
                    'key_val': plaintext
                }
            }))
        
        else:
            raise ValueError(f'Unknown command: {command}')
    
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
