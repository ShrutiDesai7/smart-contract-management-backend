package com.seventhray.contractmanagement.util;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class VectorCodec {

    private VectorCodec() {}

    public static byte[] toBytes(float[] v) {
        if (v == null || v.length == 0) return new byte[0];
        ByteBuffer bb = ByteBuffer.allocate(v.length * 4).order(ByteOrder.LITTLE_ENDIAN);
        for (float f : v) bb.putFloat(f);
        return bb.array();
    }

    public static float[] fromBytes(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return new float[0];
        if (bytes.length % 4 != 0) throw new IllegalArgumentException("Invalid float vector bytes length: " + bytes.length);
        ByteBuffer bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        float[] v = new float[bytes.length / 4];
        for (int i = 0; i < v.length; i++) v[i] = bb.getFloat();
        return v;
    }
}

